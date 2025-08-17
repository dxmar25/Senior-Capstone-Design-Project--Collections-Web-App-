import React, { useState } from "react";
import "./Modal.css";
import { saveGoal } from "../services/api";
import { useUser } from "../context/UserContext";

const SetGoalModal = ({ isOpen, onClose}) => {
    const [monthlySpending, setMonthlySpending] = useState("");
    const [spending_cushion, setSpendingCushion] = useState(false);
    const [cushionAmount, setCushionAmount] = useState("");
    const { user } = useUser();
    const userId = user?.user_id || user?.id;

    if (!isOpen) return null;

    const handleSave = async () => {
        const newGoal = {
            monthly_spending: parseFloat(monthlySpending),
            spending_cushion,
            cushion_amount: parseFloat(cushionAmount),
        };        
        try {
            console.log("Attempting to save goal:", newGoal);
            const result = await saveGoal(userId, newGoal);
            console.log("Goal saved successfully:", result);
            onClose(); // Close modal after successful save
        } catch (error) {
            console.error("Failed to save goal:", error);
            alert("An error occurred while saving the goal. Please try again.");
        }
    };    

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="set-new-goal-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="set-new-goal-modal-title">
                    <h2>Setting New Goal</h2>
                </div>
                <button className="set-new-goal-modal-close" onClick={onClose}> 
                    X
                </button>
                <div className="set-new-goal-modal-body">
                    <form className="set-new-goal-form" onSubmit={(e) => e.preventDefault()}>
                        <label>
                            Planned Monthly Spending:
                            <br />
                            <input
                                type="number"
                                placeholder="$400.00"
                                value={monthlySpending}
                                onChange={(e) => setMonthlySpending(e.target.value)}
                            />
                        </label>
                        <label>
                            Spending Cushion?
                            <br />
                            <input
                                type="checkbox"
                                id="spendingCushion"
                                name="spendingCushion"
                                checked={spending_cushion}
                                onChange={(e) => setSpendingCushion(e.target.checked)}
                            />
                        </label>
                        <label>
                            Cushion Amount:
                            <br />
                            <input
                                type="number"
                                placeholder="$25.00"
                                value={cushionAmount}
                                onChange={(e) => setCushionAmount(e.target.value)}
                            />
                        </label>
                    </form>
                </div>
                <div className="set-new-goal-modal-buttons">
                    <button className="set-new-goal-modal-save" onClick={handleSave}>
                        Save New Goal
                    </button>
                    <button className="set-new-goal-modal-cancel" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetGoalModal;
