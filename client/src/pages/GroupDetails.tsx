import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api, { apiErrorMessage } from "../api/axios";
import { queryKeys } from "../api/queryClient";
import { useGroupDetails } from "../hooks/queries";
import { summarizeBalance } from "../utils/splitSummary";
import { useAuth } from "../hooks/useAuth"; // 🔥 Added Context
import AddExpenseModal from "../components/groups/AddExpenseModal";
import SettleUpModal from "../components/groups/SettleUpModal";
import InviteMemberModal from "../components/groups/InviteMemberModal";
import "../styles/GroupDetails.css";
import formatCurrency from "../utils/currencyFormatter"; // 🔥 Removed getCurrencySymbol

function GroupDetails() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Instantly get the logged-in user & currency

  const detailsQuery = useGroupDetails(id);
  const queryClient = useQueryClient();
  const group = detailsQuery.data?.group ?? null;
  const expenses = detailsQuery.data?.expenses ?? [];
  const splits = detailsQuery.data?.splits ?? null;
  const loading = detailsQuery.isPending;
  const [copySuccess, setCopySuccess] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Refresh this group and the groups list after an expense, settlement or invite.
  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups });
  };

  /* ===================== ACTIONS ===================== */

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure? This will delete the group and all expenses permanently.")) return;
    try {
      await api.delete(`/groups/${id}`);
      queryClient.removeQueries({ queryKey: queryKeys.group(id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      navigate("/groups");
    } catch (err) {
      alert(apiErrorMessage(err, "Failed to delete group"));
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/groups/expenses/${expenseId}`);
      fetchData();
    } catch (err) {
      alert(apiErrorMessage(err, "Failed to delete expense"));
    }
  };

  const copyJoinCode = () => {
    if (!group) return;
    const code = group.joinCode || group._id;
    navigator.clipboard.writeText(code);
    setCopySuccess("Code Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  if (loading) return <div style={{ padding: 30, color: 'var(--text)' }}>Loading...</div>;
  if (!group) return <div style={{ padding: 30, color: 'var(--text)' }}>Group not found</div>;

  // 🔥 Fixed the deeply nested user reference bug
  const isAdmin = user?._id === group.adminId?._id;
  const myId = user?._id;

  const summaryText = summarizeBalance(splits, myId, user?.currency);

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

            <button
              className="btn-copy"
              onClick={copyJoinCode}
              title="Copy Invite Code to share"
            >
              <span>📋</span>
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
          {/* 🔥 Removed hardcoded currency symbol requirement */}
          <span>💸</span> Settle Up
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
                      {/* 🔥 Fixed deeply nested user reference bug here too */}
                      {exp.paidBy?.username === user?.username ? "You" : exp.paidBy?.username}
                    </span> paid <span className="amount-highlight">{formatCurrency(exp.amount, user?.currency)}</span>
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
                  {b.balance > 0.01 ? `+${formatCurrency(b.balance, user?.currency)}` : b.balance < -0.01 ? `-${formatCurrency(Math.abs(b.balance), user?.currency)}` : "Settled"}
                </span>
              </div>
            ))}
          </div>

          <h3 className="section-label" style={{ marginTop: "32px" }}>Suggested Settlements</h3>
          {!splits?.settlements || splits.settlements.length === 0 ? (
            <p className="empty-text">No settlements needed.</p>
          ) : (
            splits.settlements.map((s, index) => {
              const isMyDebt = s.from === user?.username;
              return (
                <div key={index} className="settlement-card">
                  <div className="settlement-text">
                    <strong>{s.from === user?.username ? "You" : s.from}</strong> pays <strong>{s.to === user?.username ? "you" : s.to}</strong> <span className="settlement-amount">{formatCurrency(s.amount, user?.currency)}</span>
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
          groupMembers={group.members.filter(m => m._id !== user?._id)} // 🔥 Fixed member filtering bug
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