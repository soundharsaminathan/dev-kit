import { ArrowDown, ArrowUp, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import styles from "./mocks.module.scss";
import analyticsStyles from "./payment-analytics.module.scss";
import { MockApp } from "./shell";

const METRICS: {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  trend?: { value: string; up: boolean };
}[] = [
  {
    id: "collected",
    label: "Collected",
    value: "₹1,24,500",
    hint: "This month",
    icon: Wallet,
    trend: { value: "12%", up: true },
  },
  {
    id: "outstanding",
    label: "Outstanding",
    value: "₹18,200",
    hint: "Pending dues",
    icon: IndianRupee,
    trend: { value: "8%", up: false },
  },
];

const COLLECTION_RATE = 87;

const MONTHS = [
  { id: "apr", label: "Apr", value: 62 },
  { id: "may", label: "May", value: 78 },
  { id: "jun", label: "Jun", value: 85 },
  { id: "jul", label: "Jul", value: 72 },
  { id: "aug", label: "Aug", value: 94 },
];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", value: "₹82,400", percent: 66 },
  { id: "cash", label: "Cash", value: "₹31,100", percent: 25 },
  { id: "bank", label: "Bank transfer", value: "₹11,000", percent: 9 },
];

const OVERDUE = [
  { id: "o1", name: "Ezhilan", amount: "₹3,500", days: "12 days" },
  { id: "o2", name: "Magizhan", amount: "₹7,200", days: "8 days" },
  { id: "o3", name: "Kaniyan", amount: "₹3,500", days: "5 days" },
];

export function PaymentAnalyticsMock() {
  return (
    <MockApp
      nav="invoices"
      title="Payment analytics"
      subtitle="August 2026"
      action={
        <span className={styles.badge} data-tone="ok">
          <TrendingUp style={{ width: "0.5rem", height: "0.5rem" }} />
        </span>
      }
    >
      <div className={styles.metrics}>
        {METRICS.map((item) => (
          <div key={item.id} className={styles.metricCard}>
            <span className={styles.metricLabel}>
              <span className={styles.metricIcon}>
                <item.icon />
              </span>
              {item.label}
            </span>
            <p className={styles.metricValue}>{item.value}</p>
            <div className={analyticsStyles.metricBottom}>
              <span className={styles.metricHint}>{item.hint}</span>
              {item.trend && (
                <span
                  className={analyticsStyles.trend}
                  data-up={item.trend.up ? "true" : undefined}
                >
                  {item.trend.up ? (
                    <ArrowUp className={analyticsStyles.trendIcon} />
                  ) : (
                    <ArrowDown className={analyticsStyles.trendIcon} />
                  )}
                  {item.trend.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={analyticsStyles.rateCard}>
        <div className={analyticsStyles.rateHead}>
          <span className={analyticsStyles.rateLabel}>Collection rate</span>
          <span className={analyticsStyles.rateValue}>{COLLECTION_RATE}%</span>
        </div>
        <div className={analyticsStyles.rateBar}>
          <div
            className={analyticsStyles.rateFill}
            style={{ width: `${COLLECTION_RATE}%` }}
          />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Monthly trend</p>
        <div className={analyticsStyles.chart}>
          {MONTHS.map((month) => (
            <div key={month.id} className={analyticsStyles.barCol}>
              <div className={analyticsStyles.barTrack}>
                <div
                  className={analyticsStyles.bar}
                  style={{ height: `${month.value}%` }}
                />
              </div>
              <span className={analyticsStyles.barLabel}>{month.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.section} ${styles.onlyDesktop}`}>
        <p className={styles.sectionTitle}>Payment methods</p>
        <div className={analyticsStyles.methods}>
          {PAYMENT_METHODS.map((method) => (
            <div key={method.id} className={analyticsStyles.methodRow}>
              <span className={analyticsStyles.methodLabel}>{method.label}</span>
              <span className={analyticsStyles.methodValue}>{method.value}</span>
              <div className={analyticsStyles.methodBar}>
                <div
                  className={analyticsStyles.methodFill}
                  style={{ width: `${method.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Overdue</p>
        <div className={styles.roster}>
          {OVERDUE.map((item) => (
            <div key={item.id} className={styles.rosterRow}>
              <span className={styles.avatar}>{item.name.slice(0, 2).toUpperCase()}</span>
              <span className={`${styles.rowTitle} ${styles.grow}`}>{item.name}</span>
              <span className={analyticsStyles.overdueAmount}>{item.amount}</span>
              <span className={styles.badge} data-tone="bad">
                {item.days}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockApp>
  );
}
