export default function TicketDetailsPDF({ data }: { data: any }) {
  // ✅ FIXED: Correct financial calculations (matches real invoice logic)
  const materialCostWithoutGST =
    data.materials?.reduce(
      (sum: number, item: any) => sum + item.rate * item.qty,
      0
    ) || 0;

  const totalGST =
    data.materials?.reduce(
      (sum: number, item: any) =>
        sum + item.rate * item.qty * (item.gst / 100),
      0
    ) || 0;

  const materialCostWithGST = materialCostWithoutGST + totalGST;

  const laborCost =
    (data.laborHours || 0) * (data.laborRate || 0);

  const totalEstimation =
    materialCostWithGST + laborCost;

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
        color: "#000",
        backgroundColor: "#fff",
        padding: 30,
        maxWidth: 800,
        margin: "0 auto",
        lineHeight: 1.5,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 16,
          borderBottom: "2px solid #000",
          paddingBottom: 8,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: "bold" }}>
          {data.companyName}
        </div>

        <div style={{ fontSize: 15, fontWeight: "bold" }}>
          TICKET DETAILS
        </div>

        <div style={{ fontSize: 12 }}>
          Ticket Number: {data.ticketNumber}
        </div>
      </div>

      {/* ================= TICKET INFO ================= */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionHeader}>TICKET INFORMATION</div>

        <table style={tableMain}>
          <tbody>
            {row("Status", data.status, "Priority", data.priority)}
            {row("Category", data.category, "Tenant", data.tenant)}
            {row("Created Date", data.createdDate, "Created By", data.createdBy)}
            {row("Location", data.location, "Asset ID", data.assetId)}
          </tbody>
        </table>
      </div>

      {/* ================= TEXT BLOCKS ================= */}
      {textBlock("ISSUE DESCRIPTION", data.issueTitle)}
      {textBlock("FINDINGS", data.findings)}
      {textBlock("ROOT CAUSE ANALYSIS", data.rootCause)}
      {textBlock("RECOMMENDED ACTION", data.recommendedAction)}

      {/* ================= MATERIALS ================= */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionHeader}>MATERIALS REQUIRED</div>

        <table style={tableSmall}>
          <thead>
            <tr style={{ backgroundColor: "#e0e0e0" }}>
              {["Item", "Qty", "Unit", "Rate", "GST%", "Total"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.materials?.map((item: any, i: number) => {
              const total =
                item.rate * item.qty * (1 + item.gst / 100);

              return (
                <tr key={i}>
                  <td style={td}>{item.item}</td>
                  <td style={tdCenter}>{item.qty}</td>
                  <td style={tdCenter}>{item.unit}</td>
                  <td style={tdRight}>₹{item.rate.toFixed(2)}</td>
                  <td style={tdCenter}>{item.gst}%</td>
                  <td style={tdRight}>₹{total.toFixed(2)}</td>
                </tr>
              );
            })}

            {/* LABOR ROW */}
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <td colSpan={3} style={{ ...td, fontWeight: "bold" }}>
                Labor: {data.laborDescription}
              </td>

              <td style={tdRight}>
                ₹{(data.laborRate || 0).toFixed(2)}/hr
              </td>

              <td style={tdCenter}>
                {data.laborHours || 0} hrs
              </td>

              <td style={tdRight}>
                ₹{laborCost.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================= COST ================= */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionHeader}>
          COST BREAKDOWN & ESTIMATION
        </div>

        <table style={tableMain}>
          <tbody>
            {costRow("Material Cost (without GST)", materialCostWithoutGST)}
            {costRow("Total GST", totalGST)}
            {costRow("Material Cost (with GST)", materialCostWithGST)}

            {costRow(
              `Labor Cost (${data.laborHours || 0} hours @ ₹${data.laborRate || 0}/hr)`,
              laborCost
            )}

            <tr style={{ backgroundColor: "#e0e0e0" }}>
              <td style={totalLabel}>
                TOTAL ESTIMATION:
              </td>

              <td style={totalValue}>
                ₹{totalEstimation.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================= TECHNICIAN ================= */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionHeader}>TECHNICIAN DETAILS</div>

        <table style={tableMain}>
          <tbody>
            {row(
              "Name",
              data.technician?.name,
              "Employee ID",
              data.technician?.employeeId
            )}

            {row(
              "Phone",
              data.technician?.phone,
              "Email",
              data.technician?.email
            )}

            <tr>
              <td style={label}>Role:</td>
              <td colSpan={3} style={value}>
                {data.technician?.role}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================= WORK ================= */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionHeader}>WORK TRACKING</div>

        <table style={tableMain}>
          <tbody>
            {row("SLA Time", data.slaTime, "Duration", data.actualDuration)}

            {row("Work Started", data.workStarted, "Work Ended", data.workEnded)}

            <tr>
              <td style={label}>Est. Completion:</td>
              <td colSpan={3} style={value}>
                {data.estimatedCompletionDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================= APPROVAL ================= */}
      <div style={{ marginBottom: 14 }}>
        <div style={sectionHeader}>
          OPEX CODE & APPROVAL DETAILS
        </div>

        <table style={tableMain}>
          <tbody>
            {row("OPEX Code", data.opexCode, "Approved By", data.approvedBy)}

            <tr>
              <td style={label}>Approval Date:</td>
              <td colSpan={3} style={value}>
                {data.approvedDate}
              </td>
            </tr>

            <tr>
              <td style={label}>Comments:</td>
              <td colSpan={3} style={value}>
                {data.approvalComments}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================= NOTES ================= */}
      {textBlock("ADDITIONAL NOTES", data.additionalNotes)}
    </div>
  );
}

/* ================= HELPERS ================= */

const sectionHeader = {
  fontSize: 12,
  fontWeight: "bold",
  marginBottom: 6,
  backgroundColor: "#f0f0f0",
  padding: "4px 6px",
  border: "1px solid #000",
};

const tableMain = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 11,
  border: "1px solid #000",
};

const tableSmall = {
  ...tableMain,
  fontSize: 10,
};

const th = {
  border: "1px solid #000",
  padding: "5px 6px",
  textAlign: "left",
};

const td = {
  border: "1px solid #000",
  padding: "4px 6px",
};

const tdCenter = { ...td, textAlign: "center" };
const tdRight = { ...td, textAlign: "right" };

const label = {
  border: "1px solid #ccc",
  padding: "5px 8px",
  fontWeight: "bold",
  backgroundColor: "#fafafa",
  width: "20%",
};

const value = {
  border: "1px solid #ccc",
  padding: "5px 8px",
  width: "30%",
};

const totalLabel = {
  border: "1px solid #000",
  padding: "6px 8px",
  fontWeight: "bold",
};

const totalValue = {
  border: "1px solid #000",
  padding: "6px 8px",
  textAlign: "right",
  fontWeight: "bold",
};

const row = (l1: string, v1: any, l2: string, v2: any) => (
  <tr>
    <td style={label}>{l1}:</td>
    <td style={value}>{v1}</td>
    <td style={label}>{l2}:</td>
    <td style={value}>{v2}</td>
  </tr>
);

const costRow = (labelText: string, valueNum: number) => (
  <tr>
    <td style={label}>{labelText}:</td>
    <td style={{ ...value, textAlign: "right" }}>
      ₹{valueNum.toFixed(2)}
    </td>
  </tr>
);

const textBlock = (title: string, content: string) => (
  <div style={{ marginBottom: 14 }}>
    <div style={sectionHeader}>{title}</div>
    <div
      style={{
        border: "1px solid #000",
        padding: "8px 10px",
        textAlign: "justify",
      }}
    >
      {content}
    </div>
  </div>
);