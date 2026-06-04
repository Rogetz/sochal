import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Themes
const THEMES = {
  light: "",
  dark: ".dark",
} as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<any>;
  } & (
    | {
        color?: string;
        theme?: never;
      }
    | {
        color?: never;
        theme: Record<keyof typeof THEMES, string>;
      }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used inside ChartContainer");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ReactNode;
  }
>(({ className, children, config, ...props }, ref) => {
  const id = React.useId();

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={id}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={id} config={config} />

        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});

ChartContainer.displayName = "ChartContainer";

function ChartStyle({
  id,
  config,
}: {
  id: string;
  config: ChartConfig;
}) {
  const entries = Object.entries(config).filter(
    ([, value]) => value.color || value.theme
  );

  if (!entries.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart="${id}"] {
${entries
  .map(([key, value]) => {
    const color =
      value.theme?.[theme as keyof typeof value.theme] || value.color;

    return color ? `--color-${key}: ${color};` : "";
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  payload?: any[];
  label?: any;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  formatter?: any;
  labelFormatter?: any;
  color?: string;
  labelClassName?: string;
};

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      className,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      formatter,
      labelFormatter,
      color,
      nameKey,
      labelKey,
      labelClassName,
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel) return null;

      const item = payload[0];

      const key =
        `${labelKey || item?.dataKey || item?.name || "value"}`;

      const itemConfig = getPayloadConfigFromPayload(
        config,
        item,
        key
      );

      const value =
        !labelKey && typeof label === "string"
          ? config[label]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        );
      }

      if (!value) return null;

      return (
        <div className={cn("font-medium", labelClassName)}>
          {value}
        </div>
      );
    }, [
      label,
      payload,
      labelFormatter,
      labelClassName,
      hideLabel,
      labelKey,
      config,
    ]);

    const nestLabel =
      payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}

        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const key =
              `${nameKey || item.name || item.dataKey || "value"}`;

            const itemConfig = getPayloadConfigFromPayload(
              config,
              item,
              key
            );

            const indicatorColor =
              color || item.payload?.fill || item.color;

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  "flex items-center gap-2",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter &&
                item?.value !== undefined &&
                item.name ? (
                  formatter(
                    item.value,
                    item.name,
                    item,
                    index,
                    item.payload
                  )
                ) : (
                  <>
                    {!hideIndicator && (
                      <div
                        className={cn("h-2.5 w-2.5 rounded-sm")}
                        style={{
                          backgroundColor: indicatorColor,
                        }}
                      />
                    )}

                    <div className="flex flex-1 items-center justify-between gap-2">
                      <div className="grid gap-1">
                        {nestLabel ? tooltipLabel : null}

                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>

                      {item.value !== undefined && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {Number(item.value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    payload?: any[];
    verticalAlign?: "top" | "bottom";
    hideIcon?: boolean;
    nameKey?: string;
  }
>(
  (
    {
      className,
      payload,
      verticalAlign = "bottom",
      hideIcon = false,
      nameKey,
    },
    ref
  ) => {
    const { config } = useChart();

    if (!payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item: any, index: number) => {
          const key =
            `${nameKey || item.dataKey || "value"}`;

          const itemConfig = getPayloadConfigFromPayload(
            config,
            item,
            key
          );

          return (
            <div
              key={index}
              className="flex items-center gap-1.5"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}

              <span>{itemConfig?.label}</span>
            </div>
          );
        })}
      </div>
    );
  }
);

ChartLegendContent.displayName = "ChartLegendContent";

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: any,
  key: string
) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const nestedPayload =
    typeof payload.payload === "object"
      ? payload.payload
      : undefined;

  let configKey = key;

  if (typeof payload[key] === "string") {
    configKey = payload[key];
  } else if (
    nestedPayload &&
    typeof nestedPayload[key] === "string"
  ) {
    configKey = nestedPayload[key];
  }

  return config[configKey] || config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};