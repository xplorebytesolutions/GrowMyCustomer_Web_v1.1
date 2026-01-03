import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import StatCard from "../../components/StatCard";
import ContactTrendsChart from "./ContactTrendsChart";
import Spinner from "../../components/Spinner"; // ✅ Added spinner

import { toast } from "react-toastify";

function CrmAnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axiosClient.get("/api/crm/summary");
        setSummary(response.data.result);
        toast.success(response.data.message || "CRM data loaded");
      } catch (error) {
        toast.error("Failed to load CRM summary.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return <Spinner message="Loading CRM dashboard..." />;
  }

  if (!summary) {
    return <p className="text-center text-red-500 mt-6">No data available</p>;
  }

  return (
    <div className="p-6 space-y-8 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* 📊 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Contacts" value={summary.totalContacts} />
        <StatCard title="Tagged Contacts" value={summary.taggedContacts} />
        <StatCard title="Active Reminders" value={summary.activeReminders} />
        <StatCard
          title="Completed Reminders"
          value={summary.completedReminders}
        />
        <StatCard title="Total Notes" value={summary.totalNotes} />
        <StatCard
          title="Leads with Timeline"
          value={summary.leadsWithTimeline}
        />
        <StatCard title="New Contacts Today" value={summary.newContactsToday} />
        <StatCard title="Notes Added Today" value={summary.notesAddedToday} />
        <StatCard
          title="Last Contact Added"
          value={
            summary.lastContactAddedAt
              ? new Date(summary.lastContactAddedAt).toLocaleString()
              : "N/A"
          }
        />
        <StatCard
          title="Last Reminder Completed"
          value={
            summary.lastReminderCompletedAt
              ? new Date(summary.lastReminderCompletedAt).toLocaleString()
              : "N/A"
          }
        />
      </div>

      {/* 📈 Contact Trends Chart */}
      <ContactTrendsChart />
    </div>
  );
}

export default CrmAnalyticsDashboard;
