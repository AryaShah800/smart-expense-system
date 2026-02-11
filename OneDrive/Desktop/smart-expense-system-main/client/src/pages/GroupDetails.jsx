import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import AddExpenseModal from "../components/groups/AddExpenseModal";

function GroupDetails() {
  const { id } = useParams();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [splits, setSplits] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // ✅ NEW

  const fetchData = async () => {
    try {
      const [groupRes, expenseRes, splitRes, userRes] =
        await Promise.all([
          api.get(`/groups/${id}`),
          api.get(`/groups/${id}/expenses`),
          api.get(`/groups/${id}/splits`),
          api.get(`/auth/me`)
        ]);

      setGroup(groupRes.data);
      setExpenses(expenseRes.data);
      setSplits(splitRes.data);
      setCurrentUser(userRes.data);
    } catch (err) {
      console.error("Error loading group details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: 30 }}>Loading...</div>;
  if (!group) return <div style={{ padding: 30 }}>Group not found</div>;

  // 🔥 SUMMARY LOGIC
  let summaryText = "Loading...";

  if (splits && currentUser?.user) {
    const myBalance = splits.balances?.find(
      (b) => b.userId === currentUser.user._id
    );

    if (myBalance) {
      if (myBalance.balance < 0) {
        summaryText = `You owe ₹${Math.abs(myBalance.balance)}`;
      } else if (myBalance.balance > 0) {
        summaryText = `You are owed ₹${myBalance.balance}`;
      } else {
        summaryText = "All settled up 🎉";
      }
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2>{group.name}</h2>
      <p>{group.members?.length} Members</p>

      {/* ✅ ADD EXPENSE BUTTON */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: "8px 14px",
          marginBottom: "20px",
          background: "#6366f1",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        + Add Expense
      </button>

      {/* SUMMARY */}
      <div
        style={{
          background: "#f1f5f9",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontWeight: "600"
        }}
      >
        {summaryText}
      </div>

      {/* EXPENSES */}
      <h3>Expenses</h3>
      {expenses.length === 0 ? (
        <p>No expenses yet.</p>
      ) : (
        expenses.map((exp) => (
          <div
            key={exp._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px",
              background: "white",
              marginBottom: "8px",
              borderRadius: "6px"
            }}
          >
            <div>
              {exp.description || "No description"}
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Paid by {exp.paidBy?.username}
              </div>
            </div>
            <div>₹{exp.amount}</div>
          </div>
        ))
      )}

      {/* BALANCES */}
      <h3>All Balances</h3>
      {splits?.balances?.map((b, index) => (
        <div key={index}>
          {b.username} — ₹{b.balance}
        </div>
      ))}

      {/* SETTLEMENTS */}
      <h3>Settlements</h3>
      {!splits?.settlements || splits.settlements.length === 0 ? (
        <p>No settlements needed.</p>
      ) : (
        splits.settlements.map((s, index) => (
          <div key={index}>
            {s.from} owes {s.to} ₹{s.amount}
          </div>
        ))
      )}

      {/* ✅ ADD EXPENSE MODAL */}
      {showModal && (
        <AddExpenseModal
          groupId={id}
          groupMembers={group.members}   // 🔥 IMPORTANT
          onClose={() => setShowModal(false)}
          onAdded={fetchData}            // 🔥 REFRESH DATA
        />
      )}
    </div>
  );
}

export default GroupDetails;
