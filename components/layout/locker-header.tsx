interface LockerHeaderProps {
  userName?: string
  sport?: string
  event?: string
  stats?: {
    label: string
    value: string | number
    unit?: string
    sub?: string
    color?: string
  }[]
}

export function LockerHeader({
  userName = "Athlete",
  sport = "Track & Field",
  event,
  stats = [],
}: LockerHeaderProps) {
  const nameParts = userName.trim().split(" ")
  const surname = nameParts[nameParts.length - 1].toUpperCase()
  const firstName = nameParts[0]

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        background: "var(--uni-primary)",
        backgroundImage:
          "repeating-linear-gradient(-60deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px)",
        minHeight: "128px",
      }}
    >
      <div className="flex items-stretch" style={{ paddingLeft: "28px" }}>
        {/* Surname block */}
        <div
          className="flex flex-col justify-center flex-shrink-0"
          style={{
            padding: "20px 32px 20px 0",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            className="leading-[0.9]"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(48px, 6vw, 80px)",
              color: "#f7f2ea",
              letterSpacing: "2px",
            }}
          >
            {surname}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {firstName}
          </p>
        </div>

        {/* Sport block */}
        <div
          className="flex flex-col justify-center flex-shrink-0"
          style={{
            padding: "20px 32px",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.20)",
              marginBottom: "6px",
            }}
          >
            Sport
          </p>
          <p
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "22px",
              letterSpacing: "2px",
              color: "#f7f2ea",
            }}
          >
            {sport}
          </p>
          {event && (
            <p
              className="mt-1 font-medium"
              style={{ fontSize: "11px", color: "var(--uni-accent)" }}
            >
              {event}
            </p>
          )}
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="flex items-center flex-1" style={{ padding: "0 28px" }}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col justify-center"
                style={{
                  padding: "0 20px",
                  borderRight:
                    i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.22)",
                    marginBottom: "5px",
                  }}
                >
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "38px",
                      lineHeight: 1,
                      letterSpacing: "1px",
                      color: stat.color || "#f7f2ea",
                    }}
                  >
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      {stat.unit}
                    </span>
                  )}
                </div>
                {stat.sub && (
                  <p
                    className="mt-0.5"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {stat.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Background number */}
      <span
        aria-hidden
        className="absolute pointer-events-none select-none leading-none"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "220px",
          color: "rgba(255,255,255,0.03)",
          right: "-10px",
          bottom: "-40px",
          letterSpacing: "-8px",
        }}
      >
        27
      </span>
    </div>
  )
}
