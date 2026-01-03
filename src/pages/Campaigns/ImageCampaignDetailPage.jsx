import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // ✅ NEW
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

function ImageCampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await axiosClient.get(`/campaign/${id}`);
        setCampaign(res.data);
      } catch (err) {
        toast.error("Failed to load campaign details");
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  if (loading) return <p className="text-center text-gray-500">Loading...</p>;
  if (!campaign)
    return <p className="text-center text-red-500">Campaign not found</p>;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7] p-6">
      <div className="max-w-3xl mx-auto p-6 bg-white shadow-xl rounded-xl space-y-6">
      <h2 className="text-2xl font-bold text-purple-600">
        📄 Image Campaign Details
      </h2>

      <div>
        <label className="block text-gray-600 font-semibold">
          Campaign Name
        </label>
        <p className="mt-1 text-gray-800">{campaign.name}</p>
      </div>

      <div>
        <label className="block text-gray-600 font-semibold">
          Message Template
        </label>
        <p className="mt-1 text-gray-800 whitespace-pre-wrap">
          {campaign.messageTemplate}
        </p>
      </div>

      {campaign.imageUrl && (
        <div>
          <label className="block text-gray-600 font-semibold">Image</label>
          <img
            src={campaign.imageUrl}
            alt="Campaign"
            className="mt-2 w-full h-64 object-cover border rounded"
          />
        </div>
      )}

      {campaign.imageCaption && (
        <div>
          <label className="block text-gray-600 font-semibold">
            Image Caption
          </label>
          <p className="mt-1 text-gray-800">{campaign.imageCaption}</p>
        </div>
      )}

      {campaign.cta && (
        <div>
          <label className="block text-gray-600 font-semibold">CTA</label>
          <p className="mt-1 text-gray-800">
            {campaign.cta.title} —{" "}
            <span className="text-purple-600 font-semibold">
              {campaign.cta.buttonText}
            </span>
          </p>
        </div>
      )}

      {/* ✅ Assign Contacts Button */}
      <div className="pt-4">
        <button
          onClick={() =>
            navigate(`/app/campaign/image-campaigns/${id}/assign-contacts`)
          }
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium shadow"
        >
          ➕ Assign Contacts
        </button>
      </div>
    </div>
    </div>
  );
}

export default ImageCampaignDetailPage;
