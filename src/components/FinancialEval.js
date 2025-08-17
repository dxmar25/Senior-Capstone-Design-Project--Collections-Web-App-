import React, { useState, useEffect } from "react";
import "./FinancialEval.css";
import { useNavigate } from "react-router-dom";
import SetGoalModal from "../components/SetGoalModal";
import { fetchFinancialData, getUserGoals } from "../services/api"; // Add getUserGoals
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts"; // Charting Library
import { useUser } from "../context/UserContext";

const FinancialEval = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [financialData, setFinancialData] = useState({
        totalSpending: 0,
        collections: [],
    });
    const [currentGoal, setCurrentGoal] = useState(null); // State to store the current goal
    const navigate = useNavigate();
    const openModal = () => {
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
    };
    const { user } = useUser();
    const userId = user?.user_id || user?.id;
    console.log("User from context:", user);

    useEffect(() => {
        // Load financial data
        const loadFinancialData = async () => {
            try {
                const data = await fetchFinancialData();
                setFinancialData(data);
            } catch (error) {
                console.error("Failed to load financial data:", error);
            }
        };

        // Load user goals
        const loadUserGoals = async () => {
            try {
                const goals = await getUserGoals(userId);
                if (goals.length > 0) {
                    setCurrentGoal(goals[0]); // Assume displaying the most recent goal
                }
            } catch (error) {
                console.error("Failed to load user goals:", error);
            }
        };

        loadFinancialData();
        loadUserGoals();
    }, [userId]);

    return (
        <div className="financial-eval-container">
            <button className="back-button" onClick={() => navigate(-1)}>
                &larr; Back
            </button>
            <h1 className="title">Financial Evaluation</h1>

            <div className="summary-and-modals">
                <div className="summary-box">
                    <p>
                        <strong>Total Account Spending:</strong>
                        <br />${financialData.totalSpending.toFixed(2)}
                    </p>
                    {currentGoal && (
                        <p>
                            <strong>Current Monthly Goal:</strong>
                            <br />${currentGoal.monthly_spending}
                        </p>
                    )}
                </div>
            </div>

            <div className="set-and-get-buttons">
                <button onClick={openModal}>Set New Goal</button>
            </div>

            {/* Chart: Collection Prices */}
            <div className="chart-container">
                <h3>Collection Prices</h3>
                <BarChart width={600} height={300} data={financialData.collections}>
                    <XAxis dataKey="collectionName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="price" fill="#8884d8" />
                </BarChart>
            </div>

            {/* Chart: Monthly Spending */}
            <div className="chart-container">
                <h3>Monthly Spending</h3>
                <BarChart width={600} height={300} data={financialData.monthlySpending}>
                    <XAxis dataKey="month" />
                    <YAxis/>
                    <Tooltip />
                    <Bar dataKey="amount" fill="#82ca9d" />
                    {/* Add ReferenceLine for the monthly spending goal */}
                    {currentGoal && (
                        <ReferenceLine
                            y={currentGoal.monthly_spending}
                            stroke="red"
                            strokeDasharray="3 3"
                            label={{
                                position: "top",
                                value: `Goal: $${currentGoal.monthly_spending}`,
                            }}
                        />
                    )}
                    {/* Add ReferenceLine for the cushion if enabled */}
                    {currentGoal?.spending_cushion && (
                        <ReferenceLine
                            y={currentGoal.monthly_spending + currentGoal.cushion_amount}
                            stroke="blue"
                            strokeDasharray="3 3"
                            label={{
                                position: "top",
                                value: `Cushion: $${(
                                    currentGoal.monthly_spending + currentGoal.cushion_amount
                                )}`,
                            }}
                        />
                    )}
                </BarChart>
            </div>

            <SetGoalModal isOpen={isModalOpen} onClose={closeModal} />
        </div>
    );
};

export default FinancialEval;
