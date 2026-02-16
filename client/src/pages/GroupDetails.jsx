import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import AddExpenseModal from "../components/groups/AddExpenseModal";
import SettleUpModal from "../components/groups/SettleUpModal";
import InviteMemberModal from "../components/groups/InviteMemberModal";
import "../styles/GroupDetails.css";

function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [splits, setSplits] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const fetchData = async () => {
    try {
      const [groupRes, expenseRes, splitRes, userRes] = await Promise.all([
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

  /* ===================== ACTIONS ===================== */

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure? This will delete the group and all expenses permanently.")) return;
    try {
      await api.delete(`/groups/${id}`);
      navigate("/groups");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete group");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/groups/expenses/${expenseId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete expense");
    }
  };

  // 🔥 UPDATED: Copy Join Code instead of ID
  const copyJoinCode = () => {
    // If old group has no joinCode, fallback to ID (optional)
    const code = group.joinCode || group._id;
    navigator.clipboard.writeText(code);
    setCopySuccess("Code Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  if (loading) return <div style={{ padding: 30 }}>Loading...</div>;
  if (!group) return <div style={{ padding: 30 }}>Group not found</div>;

  const isAdmin = currentUser?.user?._id === group.adminId?._id;
  const myId = currentUser?.user?._id;

  let summaryText = "Loading...";
  if (splits && currentUser?.user) {
    const myBalance = splits.balances?.find(b => b.userId === myId);
    const hasAnySettlements = splits.settlements && splits.settlements.length > 0;

    if (myBalance) {
      if (myBalance.balance < -0.01) {
        summaryText = `You owe ${formatCurrency(Math.abs(myBalance.balance))}`;
      } else if (myBalance.balance > 0.01) {
        summaryText = `You are owed ${formatCurrency(myBalance.balance)}`;
      } else {
        // I am settled, but check if the group is
        if (hasAnySettlements) {
          summaryText = "You are all settled up";
        } else {
          summaryText = "All settled up 🎉";
        }
      }
    }
  }

  return (
    <div className="group-details-page">

      {/* HEADER SECTION */}
      <div className="group-header">
        <div className="group-title">
          <h2>{group.name}</h2>

          <div className="group-meta">
            <span>{group.type}</span>
            <span className="meta-divider">•</span>
            <span>{group.members?.length} Members</span>
            <span className="meta-divider">|</span>

            <button
              className="btn-link"
              onClick={() => setShowInviteModal(true)}
            >
              + Invite Email
            </button>

            <span className="meta-divider">|</span>

            {/* 🔥 UPDATED: Display Join Code */}
            <button
              className="btn-copy"
              onClick={copyJoinCode}
              title="Copy Invite Code to share"
            >
              <span>🔑</span>
              {copySuccess || (group.joinCode ? `Code: ${group.joinCode}` : "Copy ID")}
            </button>
          </div>
        </div>

        {isAdmin && (
          <button
            className="btn-delete"
            onClick={handleDeleteGroup}
          >
            Delete Group
          </button>
        )}
      </div>

      {/* ACTION BAR */}
      <div className="action-bar">
        <button
          className="action-btn btn-add-expense"
          onClick={() => setShowAddModal(true)}
        >
          <span>+</span> Add Expense
        </button>

        <button
          className="action-btn btn-settle-up"
          onClick={() => setShowSettleModal(true)}
        >
          <span>₹</span> Settle Up
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div className="summary-banner">
        <h3>{summaryText}</h3>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="details-grid">

        {/* LEFT COLUMN: EXPENSES LIST */}
        <div className="expenses-column">
          <h3 className="section-label">Recent Expenses</h3>
          {expenses.length === 0 ? (
            <p className="empty-text">No expenses yet.</p>
          ) : (
            expenses.map((exp) => (
              <div key={exp._id} className="expense-item">
                <div className="expense-info">
                  <div className="expense-desc">{exp.description}</div>
                  <div className="expense-meta">
                    <span className="user-highlight">
                      {exp.paidBy?.username === currentUser?.user?.username ? "You" : exp.paidBy?.username}
                    </span> paid <span className="amount-highlight">{formatCurrency(exp.amount)}</span>
                  </div>
                </div>

                <div className="expense-actions">
                  {(isAdmin || exp.paidBy?._id === myId) && (
                    <button
                      className="btn-trash"
                      onClick={() => handleDeleteExpense(exp._id)}
                      title="Delete Expense"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: BALANCES & SETTLEMENTS */}
        <div className="balances-column">
          <h3 className="section-label">Balances</h3>
          <div className="balances-card">
            {splits?.balances?.map((b, index) => (
              <div key={index} className="balance-row">
                <span className="balance-user">{b.userId === myId ? <strong>You</strong> : b.username}</span>
                <span className={`balance-amount ${b.balance > 0.01 ? "pos" : b.balance < -0.01 ? "neg" : "settled"}`}>
                  {b.balance > 0.01 ? `+${formatCurrency(b.balance)}` : b.balance < -0.01 ? `-${formatCurrency(Math.abs(b.balance))}` : "Settled"}
                </span>
              </div>
            ))}
          </div>

          <h3 className="section-label" style={{ marginTop: "32px" }}>Suggested Settlements</h3>
          {!splits?.settlements || splits.settlements.length === 0 ? (
            <p className="empty-text">No settlements needed.</p>
          ) : (
            splits.settlements.map((s, index) => {
              const isMyDebt = s.from === currentUser?.user?.username;
              return (
                <div key={index} className="settlement-card">
                  <div className="settlement-text">
                    <strong>{s.from}</strong> pays <strong>{s.to}</strong> <span className="settlement-amount">{formatCurrency(s.amount)}</span>
                  </div>

                  {isMyDebt && (
                    <button
                      className="btn-pay"
                      onClick={() => setShowSettleModal(true)}
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAddModal && (
        <AddExpenseModal
          groupId={id}
          groupMembers={group.members}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchData}
        />
      )}

      {showSettleModal && (
        <SettleUpModal
          groupId={id}
          groupMembers={group.members.filter(m => m._id !== currentUser?.user?._id)}
          onClose={() => setShowSettleModal(false)}
          onSettled={fetchData}
        />
      )}

      {showInviteModal && (
        <InviteMemberModal
          groupId={id}
          onClose={() => setShowInviteModal(false)}
          onInvited={fetchData}
        />
      )}
    </div>
  );
}

export default GroupDetails;