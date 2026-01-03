import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function FlowDashboard() {
  const [summary, setSummary] = useState(null);
  const [topSteps, setTopSteps] = useState([]);
  const [stepJourney, setStepJourney] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const summaryRes = await axiosClient.get("/flow-analytics/summary");
        const stepsRes = await axiosClient.get(
          "/flow-analytics/most-triggered-steps"
        );
        const journeyRes = await axiosClient.get(
          "/flow-analytics/step-journey-breakdown"
        );
        setSummary(summaryRes.data);
        setTopSteps(stepsRes.data);
        setStepJourney(journeyRes.data);
      } catch (err) {
        toast.error("❌ Failed to load flow analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-4">Loading analytics...</div>;
  if (!summary) return <div className="p-4">No analytics data available.</div>;

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">
        📈 Visual CTA Flow Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 shadow rounded-xl">
          <p className="text-sm text-gray-500">Total Steps Triggered</p>
          <p className="text-2xl font-bold text-purple-700">
            {summary.totalExecutions}
          </p>
        </div>

        <div className="bg-white p-4 shadow rounded-xl">
          <p className="text-sm text-gray-500">Unique Contacts</p>
          <p className="text-2xl font-bold text-purple-700">
            {summary.uniqueContacts}
          </p>
        </div>

        <div className="bg-white p-4 shadow rounded-xl">
          <p className="text-sm text-gray-500">Top Triggered Step</p>
          <p className="text-xl font-semibold text-purple-600">
            {summary.topStepTriggered}
          </p>
          <p className="text-sm text-gray-500">
            Triggered {summary.topStepCount} times
          </p>
        </div>

        <div className="bg-white p-4 shadow rounded-xl">
          <p className="text-sm text-gray-500">Last Execution</p>
          <p className="text-md text-gray-700">
            {summary.lastExecutedAt
              ? new Date(summary.lastExecutedAt).toLocaleString()
              : "-"}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 shadow rounded-xl">
        <h3 className="text-lg font-bold text-purple-600 mb-2">
          🏆 Top Triggered Steps
        </h3>
        {topSteps.length === 0 ? (
          <p className="text-gray-500">No execution data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border">Step Name</th>
                  <th className="text-left p-2 border">Trigger Count</th>
                </tr>
              </thead>
              <tbody>
                {topSteps.map((step, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2 border">{step.stepName}</td>
                    <td className="p-2 border">{step.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {topSteps.length > 0 && (
        <div className="bg-white p-4 shadow rounded-xl mt-6">
          <h3 className="text-lg font-bold text-purple-600 mb-2">
            📊 Step Trigger Frequency
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSteps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stepName" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stepJourney.length > 0 && (
        <div className="bg-white p-4 shadow rounded-xl mt-6">
          <h3 className="text-lg font-bold text-purple-600 mb-2">
            🧭 Step-by-Step Journey Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border text-left">Step Name</th>
                  <th className="p-2 border text-left">Total Reached</th>
                  <th className="p-2 border text-left">Clicked Next</th>
                  <th className="p-2 border text-left">Drop-Off</th>
                  <th className="p-2 border text-left">Next Step</th>
                </tr>
              </thead>
              <tbody>
                {stepJourney.map((step, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-gray-50 ${
                      step.dropOff > 0 ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="p-2 border font-medium text-purple-700">
                      {step.templateName}
                    </td>
                    <td className="p-2 border">{step.totalReached}</td>
                    <td className="p-2 border">{step.clickedNext}</td>
                    <td className="p-2 border font-semibold text-red-600">
                      {step.dropOff}
                    </td>
                    <td className="p-2 border text-xs text-gray-500">
                      {step.nextStepId || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
