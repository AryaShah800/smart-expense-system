import { useEffect, useState } from "react";
import api from "../../api/axios";

function AddExpenseModal({ groupId, groupMembers, onClose, onAdded }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [splitType, setSplitType] = useState("equal");
  const [customSplits, setCustomSplits] = useState([]);

  // Initialize split values
  useEffect(() => {
    if (groupMembers?.length) {
      setCustomSplits(
        groupMembers.map((member) => ({
          userId: member._id,
          value: ""
        }))
      );
    }
  }, [groupMembers]);

  const handleSplitChange = (userId, value) => {
    setCustomSplits((prev) =>
      prev.map((s) =>
        s.userId === userId ? { ...s, value } : s
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      alert("Enter valid amount");
      return;
    }

    try {
      setLoading(true);

      let payload = {
        description: description || "No description",
        amount: Number(amount),
        splitType
      };

      // 🔥 For percentage and exact we ALWAYS send shareAmount
      if (splitType !== "equal") {

        payload.splits = customSplits.map(split => ({
          userId: split.userId,
          shareAmount: Number(split.value)
        }));

      }

      await api.post(`/groups/${groupId}/expenses`, payload);

      onAdded();
      onClose();

    } catch (err) {
      console.error("ADD EXPENSE ERROR:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Add Expense</h3>

        <form onSubmit={handleSubmit}>
          <input
            type="number"
            placeholder="Total Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <select
            value={splitType}
            onChange={(e) => setSplitType(e.target.value)}
          >
            <option value="equal">Equal Split</option>
            <option value="percentage">Percentage Split</option>
            <option value="exact">Exact Amount Split</option>
          </select>

          {splitType !== "equal" && (
            <div style={{ marginTop: 15 }}>
              {groupMembers.map((member) => (
                <div
                  key={member._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8
                  }}
                >
                  <span>{member.username}</span>

                  <input
                    type="number"
                    placeholder={
                      splitType === "percentage"
                        ? "Enter %"
                        : "Enter Amount"
                    }
                    value={
                      customSplits.find(
                        (s) => s.userId === member._id
                      )?.value || ""
                    }
                    onChange={(e) =>
                      handleSplitChange(
                        member._id,
                        e.target.value
                      )
                    }
                    required
                  />
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </form>

        <button
          className="close-btn"
          onClick={onClose}
          style={{ marginTop: 10 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AddExpenseModal;
