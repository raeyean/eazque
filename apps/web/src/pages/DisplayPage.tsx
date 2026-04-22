import { useParams } from "react-router-dom";
import { useBusinessData } from "../hooks/useBusinessData";
import { useActiveQueue } from "../hooks/useActiveQueue";
import { formatDisplayNumber } from "@eazque/shared";

export default function DisplayPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { business, loading: bizLoading, error: bizError } = useBusinessData(businessId!);
  const { queue, loading: queueLoading } = useActiveQueue(businessId!);

  if (bizLoading || queueLoading) {
    return <div style={styles.root}><span style={styles.label}>Loading...</span></div>;
  }

  if (bizError || !business) {
    return <div style={styles.root}><span style={styles.label}>Business not found</span></div>;
  }

  const primary = business.primaryColor || "#B8926A";

  if (!queue) {
    return (
      <div style={{ ...styles.root, borderTop: `8px solid ${primary}` }}>
        <BusinessHeader business={business} primary={primary} />
        <div style={styles.number}>—</div>
        <div style={styles.label}>Queue not started</div>
      </div>
    );
  }

  if (queue.status === "paused") {
    return (
      <div style={{ ...styles.root, borderTop: `8px solid ${primary}` }}>
        <BusinessHeader business={business} primary={primary} />
        <div style={{ ...styles.number, opacity: 0.4 }}>
          {formatDisplayNumber(queue.currentNumber)}
        </div>
        <div style={{ ...styles.statusBadge, background: "#f0a500" }}>Queue Paused</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.root, borderTop: `8px solid ${primary}` }}>
      <BusinessHeader business={business} primary={primary} />
      <div style={styles.nowServing}>NOW SERVING</div>
      <div style={{ ...styles.number, color: primary }}>
        {formatDisplayNumber(queue.currentNumber)}
      </div>
      <div style={styles.waiting}>
        {Math.max(0, queue.nextNumber - queue.currentNumber - 1)} waiting
      </div>
    </div>
  );
}

function BusinessHeader({
  business,
  primary,
}: {
  business: { name: string; logo?: string };
  primary: string;
}) {
  return (
    <div style={styles.header}>
      {business.logo ? (
        <img src={business.logo} alt={business.name} style={styles.logo} />
      ) : (
        <div style={{ ...styles.logoFallback, background: primary }}>
          {business.name[0]?.toUpperCase()}
        </div>
      )}
      <div style={styles.businessName}>{business.name}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a1a",
    color: "#f5f0ea",
    fontFamily: "system-ui, sans-serif",
    gap: "1rem",
    padding: "2rem",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
  },
  logoFallback: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    fontWeight: 700,
    color: "#fff",
  },
  businessName: {
    fontSize: "clamp(1.25rem, 3vw, 2rem)",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "#e8ddd0",
  },
  nowServing: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.5rem)",
    fontWeight: 700,
    letterSpacing: "0.2em",
    color: "#a08060",
    textTransform: "uppercase" as const,
  },
  number: {
    fontSize: "clamp(8rem, 25vw, 20rem)",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  waiting: {
    fontSize: "clamp(1rem, 2.5vw, 1.75rem)",
    color: "#a08060",
    marginTop: "0.5rem",
  },
  label: {
    fontSize: "clamp(1rem, 2.5vw, 1.75rem)",
    color: "#a08060",
  },
  statusBadge: {
    padding: "0.5rem 2rem",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: "clamp(1rem, 2vw, 1.5rem)",
    color: "#1a1a1a",
    letterSpacing: "0.05em",
  },
};
