import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

function ImageCampaignEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState({
    name: "",
    messageTemplate: "",
    imageUrl: "",
    imageCaption: "",
    ctaId: "",
  });
  const [ctaOptions, setCtaOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Load campaign + CTA options
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignRes, ctaRes] = await Promise.all([
          axiosClient.get(`/campaigns/${id}`),
          axiosClient.get("/ctas"),
        ]);
        const c = campaignRes.data;
        setCampaign({
          name: c.name,
          messageTemplate: c.messageTemplate,
          imageUrl: c.imageUrl,
          imageCaption: c.imageCaption,
          ctaId: c.ctaId || "",
        });
        setCtaOptions(ctaRes.data);
      } catch (err) {
        toast.error("Failed to load data");
      }
    };
    fetchData();
  }, [id]);

  const handleChange = e => {
    const { name, value } = e.target;
    setCampaign(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axiosClient.put(`/campaigns/${id}`, campaign);
      toast.success("Campaign updated");
      navigate("/app/campaigns/image-campaigns");
    } catch {
      toast.error("Failed to update campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7] p-6">
      <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl space-y-4">
      <h2 className="text-xl font-bold text-purple-600">
        ✏️ Edit Image Campaign
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          value={campaign.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          placeholder="Campaign Name"
          required
        />
        <textarea
          name="messageTemplate"
          value={campaign.messageTemplate}
          onChange={handleChange}
          rows={3}
          className="w-full p-2 border rounded"
          placeholder="Message Template"
        />
        <input
          type="text"
          name="imageUrl"
          value={campaign.imageUrl}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          placeholder="Image URL"
        />
        {campaign.imageUrl && (
          <img
            src={campaign.imageUrl}
            alt="Preview"
            className="w-full h-56 object-cover border rounded"
          />
        )}
        <input
          type="text"
          name="imageCaption"
          value={campaign.imageCaption}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          placeholder="Image Caption"
        />
        <select
          name="ctaId"
          value={campaign.ctaId}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="">Select CTA</option>
          {ctaOptions.map(cta => (
            <option key={cta.id} value={cta.id}>
              {cta.title} — {cta.buttonText}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
        >
          {submitting ? "Updating..." : "Update Campaign"}
        </button>
      </form>
    </div>
    </div>
  );
}

export default ImageCampaignEditPage;
