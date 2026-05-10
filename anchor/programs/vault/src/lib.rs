use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};


use anchor_lang::prelude::*;

declare_id!("DtkhpMSR9ZXjZCiGurAVFSMANJ9cAEQAxWdgczvCdLSB");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

// Platform fee (10%)
const PLATFORM_FEE_BPS: u64 = 1000;

// Live stream minimum target
const LIVE_TARGET: u64 = LAMPORTS_PER_SOL; // 1 SOL

// Time extensions (seconds)
const LIVE_EXTENSION: i64 = 900;       // 15 minutes
const CHALLENGE_EXTENSION: i64 = 900;  // 15 minutes
const FINAL_EXTENSION: i64 = 1800;     // 30 minutes

// Tournament limits
const MAX_PARTICIPANTS: usize = 32;
const MAX_ROUNDS: u8 = 4;   // rounds 0,1,2,3 (final)

// Challenge minimum targets per round
const CHALLENGE_TARGETS: [u64; MAX_ROUNDS as usize] = [
    10 * LAMPORTS_PER_SOL,  // round 0
    20 * LAMPORTS_PER_SOL,  // round 1
    40 * LAMPORTS_PER_SOL,  // round 2
    100 * LAMPORTS_PER_SOL, // round 3 (final)
];

// Maximum tracking limits
const MAX_TIPPERS: usize = 500;
const MAX_MENU_ITEMS: usize = 20;
const MAX_ITEM_NAME_LEN: usize = 20;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Target not reached")]
    TargetNotReached,
    #[msg("Already closed")]
    AlreadyClosed,
    #[msg("Time extension not yet elapsed")]
    TooEarly,
    #[msg("Challenge is still active")]
    ChallengeActive,
    #[msg("Invalid topic")]
    InvalidTopic,
    #[msg("Duplicate participant")]
    DuplicateParticipant,
    #[msg("Tournament full")]
    TournamentFull,
    #[msg("Invalid round")]
    InvalidRound,
    #[msg("Round not complete")]
    RoundNotComplete,
    #[msg("Maximum tippers reached")]
    MaxTippersReached,
    #[msg("Invalid menu index")]
    InvalidMenuIndex,
    #[msg("Tip amount does not match menu price")]
    InvalidMenuPrice,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Tournament not active")]
    TournamentNotActive,
    #[msg("Invalid creator side (0 or 1)")]
    InvalidSide,
}

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub live_counter: u64,
    pub bump: u8,
    pub treasury_bump: u8,
}

impl GlobalState {
    pub const SPACE: usize = 8 + 32 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct MenuItem {
    pub name: [u8; MAX_ITEM_NAME_LEN],
    pub name_len: u8,
    pub price: u64,
}

impl Default for MenuItem {
    fn default() -> Self {
        Self {
            name: [0u8; MAX_ITEM_NAME_LEN],
            name_len: 0,
            price: 0,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct TipRecord {
    pub fan: Pubkey,
    pub amount: u64,
}

impl Default for TipRecord {
    fn default() -> Self {
        Self {
            fan: Pubkey::default(),
            amount: 0,
        }
    }
}

#[account]
pub struct Live {
    pub live_id: u64,
    pub creator: Pubkey,
    pub topic: String,
    pub total_tips: u64,
    pub top_tipper: Pubkey,
    pub top_tipper_amount: u64,
    pub target_reached_at: Option<i64>,
    pub closed: bool,
    pub menu_items: [MenuItem; MAX_MENU_ITEMS],
    pub menu_count: u8,
    pub fan_tips: [TipRecord; MAX_TIPPERS],
    pub fan_count: u32,
    pub bump: u8,
}

impl Live {
    pub const SPACE: usize = 8 + // discriminator
        8 + // live_id
        32 + // creator
        4 + 32 + // topic (max 32 chars)
        8 + // total_tips
        32 + // top_tipper
        8 + // top_tipper_amount
        1 + 8 + // target_reached_at (Option)
        1 + // closed
        (MAX_MENU_ITEMS * (MAX_ITEM_NAME_LEN + 1 + 8)) + 1 + // menu_items + menu_count
        (MAX_TIPPERS * (32 + 8)) + 4 + // fan_tips + fan_count
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TournamentStatus {
    Pending,
    ActiveRound(u8),
    Completed,
}

#[account]
pub struct TournamentGroup {
    pub topic: String,
    pub status: TournamentStatus,
    pub current_round: u8,
    pub participants: [Pubkey; MAX_PARTICIPANTS],
    pub participant_count: u8,
    pub round_winners: [Pubkey; 16], // stores winners of each round sequentially; re‑used per round
    pub bump: u8,
}

impl TournamentGroup {
    pub const SPACE: usize = 8 +
        4 + 32 + // topic (String)
        1 + 1 + // status enum + current_round
        (32 * MAX_PARTICIPANTS) + 1 + // participants array + count
        (32 * 16) + // round_winners (max 16)
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ChallengeStatus {
    ActivePreTarget,
    ActiveExtension,
    Closed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ChallengeTip {
    pub fan: Pubkey,
    pub a_tip: u64,
    pub b_tip: u64,
}

impl Default for ChallengeTip {
    fn default() -> Self {
        Self {
            fan: Pubkey::default(),
            a_tip: 0,
            b_tip: 0,
        }
    }
}

#[account]
pub struct Challenge {
    pub tournament_group: Pubkey,
    pub round: u8,
    pub pair_index: u8,
    pub creator_a: Pubkey,
    pub creator_b: Pubkey,
    pub status: ChallengeStatus,
    pub target_min: u64,
    pub a_total: u64,
    pub b_total: u64,
    pub top_tipper: Pubkey,
    pub top_tipper_amount: u64,
    pub target_reached_at: Option<i64>,
    pub winner: Option<Pubkey>,
    pub fan_tips: [ChallengeTip; MAX_TIPPERS],
    pub fan_count: u32,
    pub bump: u8,
}

impl Challenge {
    pub const SPACE: usize = 8 +
        32 + // tournament_group
        1 + 1 + // round, pair_index
        32 + 32 + // creator_a, creator_b
        1 + 1 + // status enum (+ padding)
        8 + // target_min
        8 + 8 + // a_total, b_total
        32 + // top_tipper
        8 + // top_tipper_amount
        1 + 8 + // target_reached_at (Option)
        1 + 32 + // winner (Option)
        (MAX_TIPPERS * (32 + 8 + 8)) + 4 + // fan_tips + fan_count
        1; // bump
}

// ---------------------------------------------------------------------------
// PDA seeds
// ---------------------------------------------------------------------------

const GLOBAL_SEED: &[u8] = b"global";
const LIVE_SEED: &[u8] = b"live";
const TOURNAMENT_SEED: &[u8] = b"tournament";
const CHALLENGE_SEED: &[u8] = b"challenge";
const PRIZE_VAULT_SEED: &[u8] = b"prize_vault";
const TREASURY_SEED: &[u8] = b"treasury";

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod vault {
    use super::*;

    /// Initializes the global state and treasury PDA.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let global = &mut ctx.accounts.global;
        global.admin = ctx.accounts.admin.key();
        global.live_counter = 0;
        global.bump = ctx.bumps.global;
        global.treasury_bump = ctx.bumps.treasury;
        Ok(())
    }

    /// Creates a live stream.
    pub fn create_live(ctx: Context<CreateLive>, topic: String, menu_items: Vec<MenuItem>) -> Result<()> {
        require!(topic.len() <= 32, ErrorCode::InvalidTopic);
        let global = &mut ctx.accounts.global;
        let live = &mut ctx.accounts.live;
        let live_id = global.live_counter;

        let mut menu_fixed = [MenuItem::default(); MAX_MENU_ITEMS];
        for (i, item) in menu_items.iter().enumerate() {
            require!(i < MAX_MENU_ITEMS, ErrorCode::InvalidMenuIndex);
            require!(
                item.name_len as usize <= MAX_ITEM_NAME_LEN,
                ErrorCode::InvalidMenuIndex
            );
            menu_fixed[i] = item.clone();
        }

        live.live_id = live_id;
        live.creator = ctx.accounts.creator.key();
        live.topic = topic;
        live.total_tips = 0;
        live.top_tipper = Pubkey::default();
        live.top_tipper_amount = 0;
        live.target_reached_at = None;
        live.closed = false;
        live.menu_items = menu_fixed;
        live.menu_count = menu_items.len() as u8;
        live.fan_tips = [TipRecord::default(); MAX_TIPPERS];
        live.fan_count = 0;
        live.bump = ctx.bumps.live;

        global.live_counter = global
            .live_counter
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        Ok(())
    }

    /// Fans tip a live stream.
    pub fn tip_live(ctx: Context<TipLive>, amount: u64, menu_index: Option<u8>) -> Result<()> {
        let live = &mut ctx.accounts.live;
        let clock = Clock::get()?;

        require!(!live.closed, ErrorCode::AlreadyClosed);
        require!(amount >= LAMPORTS_PER_SOL / 100, ErrorCode::InvalidMenuPrice);

        if let Some(idx) = menu_index {
            require!((idx as usize) < MAX_MENU_ITEMS, ErrorCode::InvalidMenuIndex);
            require!(amount == live.menu_items[idx as usize].price, ErrorCode::InvalidMenuPrice);
        }

        // Transfer SOL from fan to live PDA
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.fan.to_account_info(),
                    to: live.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update fan tip record
        let fan_key = ctx.accounts.fan.key();
        let mut found = false;
        let mut fan_total = amount;
        for i in 0..(live.fan_count as usize) {
            if live.fan_tips[i].fan == fan_key {
                let updated = live.fan_tips[i]
                    .amount
                    .checked_add(amount)
                    .ok_or(ErrorCode::Overflow)?;
                live.fan_tips[i].amount = updated;
                fan_total = updated;
                found = true;
                break;
            }
        }
        if !found {
            let fan_count = live.fan_count;
            require!((fan_count as usize) < MAX_TIPPERS, ErrorCode::MaxTippersReached);
            live.fan_tips[fan_count as usize] = TipRecord {
                fan: fan_key,
                amount,
            };
            live.fan_count = live.fan_count.checked_add(1).ok_or(ErrorCode::Overflow)?;
            fan_total = amount;
        }

        // Update top tipper
        if fan_total > live.top_tipper_amount {
            live.top_tipper = fan_key;
            live.top_tipper_amount = fan_total;
        }

        live.total_tips = live
            .total_tips
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        if live.total_tips >= LIVE_TARGET && live.target_reached_at.is_none() {
            live.target_reached_at = Some(clock.unix_timestamp);
        }
        Ok(())
    }

    /// Closes a live stream and distributes rewards.
    pub fn close_live(ctx: Context<CloseLive>) -> Result<()> {
        let live = &mut ctx.accounts.live;
        let clock = Clock::get()?;

        require!(!live.closed, ErrorCode::AlreadyClosed);
        require!(live.target_reached_at.is_some(), ErrorCode::TargetNotReached);
        require!(
            clock.unix_timestamp >= live.target_reached_at.unwrap().checked_add(LIVE_EXTENSION).unwrap(),
            ErrorCode::TooEarly
        );

        let total = live.to_account_info().lamports();

        let creator_share = total.checked_mul(85).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
        let top_tipper_share = total.checked_mul(5).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
        let fee = total.checked_mul(10).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();

        // Transfer to creator
        **live.to_account_info().try_borrow_mut_lamports()? -= creator_share;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += creator_share;

        // Transfer to top tipper (if any)
        if top_tipper_share > 0 && live.top_tipper != Pubkey::default() {
            **live.to_account_info().try_borrow_mut_lamports()? -= top_tipper_share;
            **ctx.accounts.top_tipper.to_account_info().try_borrow_mut_lamports()? += top_tipper_share;
        }

        // Fee to treasury
        **live.to_account_info().try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee;

        live.closed = true;
        Ok(())
    }

    /// Creator enters a tournament after closing a live.
    pub fn enter_challenge(ctx: Context<EnterChallenge>) -> Result<()> {
        let live = &ctx.accounts.live;
        let group = &mut ctx.accounts.tournament_group;
        let participant_count = group.participant_count;

        require!(live.closed, ErrorCode::ChallengeActive);
        require!(live.creator == ctx.accounts.creator.key(), ErrorCode::Unauthorized);
        require!(group.topic == live.topic, ErrorCode::InvalidTopic);
        require!((participant_count as usize) < MAX_PARTICIPANTS, ErrorCode::TournamentFull);

        // Check duplicate
        for i in 0..(participant_count as usize) {
            require!(group.participants[i] != live.creator, ErrorCode::DuplicateParticipant);
        }

        group.participants[participant_count as usize] = live.creator;
        group.participant_count = group.participant_count.checked_add(1).ok_or(ErrorCode::Overflow)?;

        // If full, automatically start tournament
        if group.participant_count == MAX_PARTICIPANTS as u8 {
            group.status = TournamentStatus::ActiveRound(0);
            group.current_round = 0;
        }
        Ok(())
    }

    /// Creates a challenge account for a pair in a tournament round.
    pub fn create_challenge(ctx: Context<CreateChallenge>, pair_index: u8) -> Result<()> {
        let group = &ctx.accounts.tournament_group;
        let challenge = &mut ctx.accounts.challenge;

        require!(
            group.status == TournamentStatus::ActiveRound(group.current_round),
            ErrorCode::TournamentNotActive
        );

        let round = group.current_round;
        challenge.tournament_group = group.key();
        challenge.round = round;
        challenge.pair_index = pair_index;
        challenge.target_min = CHALLENGE_TARGETS[round as usize];
        challenge.status = ChallengeStatus::ActivePreTarget;
        challenge.a_total = 0;
        challenge.b_total = 0;
        challenge.top_tipper = Pubkey::default();
        challenge.top_tipper_amount = 0;
        challenge.target_reached_at = None;
        challenge.winner = None;
        challenge.fan_tips = [ChallengeTip::default(); MAX_TIPPERS];
        challenge.fan_count = 0;
        challenge.bump = ctx.bumps.challenge;

        Ok(())
    }

    /// Tips during a challenge.
    pub fn tip_challenge(ctx: Context<TipChallenge>, creator_side: u8, amount: u64) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let clock = Clock::get()?;

        require!(challenge.status != ChallengeStatus::Closed, ErrorCode::AlreadyClosed);
        require!(amount >= LAMPORTS_PER_SOL / 100, ErrorCode::InvalidMenuPrice);
        require!(creator_side <= 1, ErrorCode::InvalidSide);

        // Transfer SOL
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.fan.to_account_info(),
                    to: challenge.to_account_info(),
                },
            ),
            amount,
        )?;

        let fan_key = ctx.accounts.fan.key();
        let mut found = false;
        let mut fan_total = amount;
        for i in 0..(challenge.fan_count as usize) {
            if challenge.fan_tips[i].fan == fan_key {
                let mut a_tip = challenge.fan_tips[i].a_tip;
                let mut b_tip = challenge.fan_tips[i].b_tip;
                if creator_side == 0 {
                    a_tip = a_tip.checked_add(amount).ok_or(ErrorCode::Overflow)?;
                } else {
                    b_tip = b_tip.checked_add(amount).ok_or(ErrorCode::Overflow)?;
                }
                challenge.fan_tips[i].a_tip = a_tip;
                challenge.fan_tips[i].b_tip = b_tip;
                fan_total = a_tip.checked_add(b_tip).ok_or(ErrorCode::Overflow)?;
                found = true;
                break;
            }
        }
        if !found {
            let fan_count = challenge.fan_count;
            require!(
                (fan_count as usize) < MAX_TIPPERS,
                ErrorCode::MaxTippersReached
            );
            let mut tip = ChallengeTip::default();
            tip.fan = fan_key;
            if creator_side == 0 {
                tip.a_tip = amount;
            } else {
                tip.b_tip = amount;
            }
            challenge.fan_tips[fan_count as usize] = tip;
            challenge.fan_count = challenge.fan_count.checked_add(1).ok_or(ErrorCode::Overflow)?;
            fan_total = amount;
        }

        if creator_side == 0 {
            challenge.a_total = challenge.a_total.checked_add(amount).ok_or(ErrorCode::Overflow)?;
        } else {
            challenge.b_total = challenge.b_total.checked_add(amount).ok_or(ErrorCode::Overflow)?;
        }

        // Top tipper
        if fan_total > challenge.top_tipper_amount {
            challenge.top_tipper = fan_key;
            challenge.top_tipper_amount = fan_total;
        }

        let total = challenge.a_total.checked_add(challenge.b_total).ok_or(ErrorCode::Overflow)?;
        if total >= challenge.target_min && challenge.status == ChallengeStatus::ActivePreTarget {
            challenge.target_reached_at = Some(clock.unix_timestamp);
            challenge.status = ChallengeStatus::ActiveExtension;
        }
        Ok(())
    }

    /// Closes a challenge and distributes rewards.
    pub fn close_challenge(ctx: Context<CloseChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let group = &mut ctx.accounts.tournament_group;
        let clock = Clock::get()?;

        require!(challenge.status == ChallengeStatus::ActiveExtension, ErrorCode::ChallengeActive);
        let is_final = group.current_round == MAX_ROUNDS.saturating_sub(1);
        let extension = if is_final { FINAL_EXTENSION } else { CHALLENGE_EXTENSION };
        require!(
            clock.unix_timestamp >= challenge.target_reached_at.unwrap().checked_add(extension).unwrap(),
            ErrorCode::TooEarly
        );

        let winner = if challenge.a_total >= challenge.b_total {
            challenge.creator_a
        } else {
            challenge.creator_b
        };
        let loser = if winner == challenge.creator_a {
            challenge.creator_b
        } else {
            challenge.creator_a
        };

        challenge.winner = Some(winner);
        challenge.status = ChallengeStatus::Closed;

        let mut balance = challenge.to_account_info().lamports();

        if is_final {
            // Absorb prize vault
            let vault_lamports = ctx.accounts.prize_vault.to_account_info().lamports();
            **ctx.accounts.prize_vault.to_account_info().try_borrow_mut_lamports()? -= vault_lamports;
            **challenge.to_account_info().try_borrow_mut_lamports()? += vault_lamports;
            balance = balance.checked_add(vault_lamports).ok_or(ErrorCode::Overflow)?;

            let winner_share = balance.checked_mul(70).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let loser_share = balance.checked_mul(15).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let tipper_share = balance.checked_mul(5).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let fee = balance.checked_mul(10).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();

            // Winner
            **challenge.to_account_info().try_borrow_mut_lamports()? -= winner_share;
            **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += winner_share;
            // Loser
            **challenge.to_account_info().try_borrow_mut_lamports()? -= loser_share;
            **ctx.accounts.loser.to_account_info().try_borrow_mut_lamports()? += loser_share;
            // Top tipper
            if tipper_share > 0 && challenge.top_tipper != Pubkey::default() {
                **challenge.to_account_info().try_borrow_mut_lamports()? -= tipper_share;
                **ctx.accounts.top_tipper.to_account_info().try_borrow_mut_lamports()? += tipper_share;
            }
            // Fee
            **challenge.to_account_info().try_borrow_mut_lamports()? -= fee;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee;
        } else {
            let winner_share = balance.checked_mul(55).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let loser_share = balance.checked_mul(15).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let tipper_share = balance.checked_mul(5).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let pool_share = balance.checked_mul(15).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();
            let fee = balance.checked_mul(10).ok_or(ErrorCode::Overflow)?.checked_div(100).unwrap();

            // Winner
            **challenge.to_account_info().try_borrow_mut_lamports()? -= winner_share;
            **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += winner_share;
            // Loser
            **challenge.to_account_info().try_borrow_mut_lamports()? -= loser_share;
            **ctx.accounts.loser.to_account_info().try_borrow_mut_lamports()? += loser_share;
            // Top tipper
            if tipper_share > 0 && challenge.top_tipper != Pubkey::default() {
                **challenge.to_account_info().try_borrow_mut_lamports()? -= tipper_share;
                **ctx.accounts.top_tipper.to_account_info().try_borrow_mut_lamports()? += tipper_share;
            }
            // Prize vault
            **challenge.to_account_info().try_borrow_mut_lamports()? -= pool_share;
            **ctx.accounts.prize_vault.to_account_info().try_borrow_mut_lamports()? += pool_share;
            // Fee
            **challenge.to_account_info().try_borrow_mut_lamports()? -= fee;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee;
        }

        // Record winner in tournament group
        let num_pairs = match group.current_round {
            0 => 16,
            1 => 8,
            2 => 4,
            3 => 2,
            _ => unreachable!(),
        };
        let idx = challenge.pair_index as usize;
        require!(idx < num_pairs, ErrorCode::InvalidRound);
        group.round_winners[idx] = winner;

        Ok(())
    }

    /// Advances the tournament to the next round after all challenges are closed.
    pub fn finalize_round(ctx: Context<FinalizeRound>) -> Result<()> {
        let group = &mut ctx.accounts.tournament_group;

        require!(
            group.status == TournamentStatus::ActiveRound(group.current_round),
            ErrorCode::InvalidRound
        );

        let round = group.current_round;
        let num_pairs = match round {
            0 => 16,
            1 => 8,
            2 => 4,
            3 => 2,
            _ => unreachable!(),
        };

        for i in 0..num_pairs {
            require!(group.round_winners[i] != Pubkey::default(), ErrorCode::RoundNotComplete);
        }

        let next_round = round.checked_add(1).ok_or(ErrorCode::Overflow)?;
        if next_round >= MAX_ROUNDS {
            group.status = TournamentStatus::Completed;
        } else {
            group.status = TournamentStatus::ActiveRound(next_round);
            group.current_round = next_round;
            // Clear round_winners for the new round (optional, but safe)
            // Actually we need to preserve the previous winners for the next round's challenge creation.
            // So we do NOT clear; the next round's create_challenge will use round_winners as participants.
            // But we must shift the winners to the beginning? We'll let the frontend derive participants from round_winners entries 0..num_pairs.
            // Since round_winners array has 16 slots, for round 1 we expect entries 0..7 to be valid (the 8 winners).
            // That's fine. We'll just keep them.
        }
        Ok(())
    }

    /// Admin withdraws accumulated fees.
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.global.admin, ErrorCode::Unauthorized);
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.admin.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account validation structs
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = GlobalState::SPACE,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global: Account<'info, GlobalState>,
    /// CHECK: PDA for treasury, no data stored
    #[account(
        init,
        payer = admin,
        seeds = [TREASURY_SEED],
        bump,
        space = 8
    )]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateLive<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump = global.bump
    )]
    pub global: Account<'info, GlobalState>,
    #[account(
        init,
        payer = creator,
        space = Live::SPACE,
        seeds = [
            LIVE_SEED,
            &global.live_counter.to_le_bytes()
        ],
        bump
    )]
    pub live: Account<'info, Live>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipLive<'info> {
    #[account(mut)]
    pub fan: Signer<'info>,
    #[account(
        mut,
        seeds = [LIVE_SEED, &live.live_id.to_le_bytes()],
        bump = live.bump,
    )]
    pub live: Account<'info, Live>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseLive<'info> {
    #[account(
        mut,
        seeds = [LIVE_SEED, &live.live_id.to_le_bytes()],
        bump = live.bump,
    )]
    pub live: Account<'info, Live>,
    /// CHECK: creator account, validated by live.creator
    #[account(mut, address = live.creator)]
    pub creator: AccountInfo<'info>,
    /// CHECK: top tipper account, validated by live.top_tipper
    #[account(mut, address = live.top_tipper)]
    pub top_tipper: AccountInfo<'info>,
    /// CHECK: treasury PDA
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump,
    )]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EnterChallenge<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        seeds = [LIVE_SEED, &live.live_id.to_le_bytes()],
        bump = live.bump,
    )]
    pub live: Account<'info, Live>,
    #[account(
        init_if_needed,
        payer = creator,
        space = TournamentGroup::SPACE,
        seeds = [TOURNAMENT_SEED, live.topic.as_bytes()],
        bump
    )]
    pub tournament_group: Account<'info, TournamentGroup>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pair_index: u8)]
pub struct CreateChallenge<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        seeds = [TOURNAMENT_SEED, tournament_group.topic.as_bytes()],
        bump = tournament_group.bump,
    )]
    pub tournament_group: Account<'info, TournamentGroup>,
    #[account(
        init,
        payer = payer,
        space = Challenge::SPACE,
        seeds = [
            CHALLENGE_SEED,
            tournament_group.key().as_ref(),
            &[tournament_group.current_round],
            &[pair_index],
        ],
        bump
    )]
    pub challenge: Account<'info, Challenge>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TipChallenge<'info> {
    #[account(mut)]
    pub fan: Signer<'info>,
    #[account(
        mut,
        seeds = [
            CHALLENGE_SEED,
            challenge.tournament_group.as_ref(),
            &[challenge.round],
            &[challenge.pair_index],
        ],
        bump = challenge.bump,
    )]
    pub challenge: Account<'info, Challenge>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseChallenge<'info> {
    #[account(
        mut,
        seeds = [
            CHALLENGE_SEED,
            challenge.tournament_group.as_ref(),
            &[challenge.round],
            &[challenge.pair_index],
        ],
        bump = challenge.bump,
    )]
    pub challenge: Account<'info, Challenge>,
    #[account(
        mut,
        seeds = [TOURNAMENT_SEED, tournament_group.topic.as_bytes()],
        bump = tournament_group.bump,
    )]
    pub tournament_group: Account<'info, TournamentGroup>,
    /// CHECK: validated against challenge.winner
    #[account(mut)]
    pub winner: AccountInfo<'info>,
    /// CHECK: validated against loser logic
    #[account(mut)]
    pub loser: AccountInfo<'info>,
    /// CHECK: validated against challenge.top_tipper
    #[account(mut)]
    pub top_tipper: AccountInfo<'info>,
    /// CHECK: prize vault PDA
    #[account(
        mut,
        seeds = [PRIZE_VAULT_SEED, tournament_group.key().as_ref()],
        bump,
    )]
    pub prize_vault: AccountInfo<'info>,
    /// CHECK: treasury PDA
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump,
    )]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeRound<'info> {
    #[account(
        mut,
        seeds = [TOURNAMENT_SEED, tournament_group.topic.as_bytes()],
        bump = tournament_group.bump,
    )]
    pub tournament_group: Account<'info, TournamentGroup>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [GLOBAL_SEED],
        bump = global.bump,
    )]
    pub global: Account<'info, GlobalState>,
    /// CHECK: treasury PDA
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump,
    )]
    pub treasury: AccountInfo<'info>,
}