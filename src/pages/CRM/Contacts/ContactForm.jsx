import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

function ContactForm({ contact, onSaveComplete }) {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    leadSource: "",
    notes: "",
    tags: [], // Array of tag IDs
    // Date fields are handled separately to avoid timezone issues
  });
  const [allTags, setAllTags] = useState([]);
  const [saving, setSaving] = useState(false);

  // Fetch all available tags when the component mounts
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axiosClient.get("/tags");
        setAllTags(response.data.data || response.data); // Handle wrapper if it exists
      } catch (error) {
        console.error("Failed to load tags:", error);
        toast.error("❌ Failed to load tags");
      }
    };
    fetchTags();
  }, []);

  // Populate the form when an existing contact is passed in
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || "",
        phoneNumber: contact.phoneNumber || "",
        email: contact.email || "",
        leadSource: contact.leadSource || "",
        notes: contact.notes || "",
        tags: contact.tags?.map(t => t.tagId) || [],
      });
    }
  }, [contact]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagChange = e => {
    const selected = Array.from(e.target.selectedOptions, opt => opt.value);
    setFormData(prev => ({ ...prev, tags: selected }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);

    // Backend expects an array of Guids/strings for the tag IDs
    const payload = {
      ...formData,
      tagIds: formData.tags, // Send just the array of IDs
    };

    try {
      if (contact?.id) {
        // Update existing contact
        await axiosClient.put(`/contacts/${contact.id}`, payload);
        toast.success("✅ Contact updated successfully!");
      } else {
        // Create new contact
        await axiosClient.post("/contacts/create", payload);
        toast.success("✅ Contact created successfully!");
      }
      onSaveComplete?.(); // Notify parent component to refresh/close
    } catch (err) {
      // Display the specific error message from the backend
      const errorMessage =
        err.response?.data?.message || "❌ Failed to save contact.";
      toast.error(errorMessage);
      console.error("Save contact failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
        placeholder="Name"
        className="w-full border px-3 py-2 rounded-md"
      />
      <input
        name="phoneNumber"
        value={formData.phoneNumber}
        onChange={handleChange}
        placeholder="Phone Number"
        className="w-full border px-3 py-2 rounded-md"
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
        className="w-full border px-3 py-2 rounded-md"
      />

      <div>
        <label className="text-sm text-gray-600">Tags</label>
        <select
          multiple
          value={formData.tags}
          onChange={handleTagChange}
          className="w-full border px-3 py-2 rounded-md h-24"
        >
          {allTags.map(tag => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        placeholder="Notes..."
        className="w-full border px-3 py-2 rounded-md"
        rows={3}
      />

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : contact?.id ? "Update Contact" : "Add Contact"}
      </button>
    </form>
  );
}

export default ContactForm;

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "react-toastify";

// function ContactForm({ contact, onSaveComplete }) {
//   const [formData, setFormData] = useState({
//     name: "",
//     phoneNumber: "",
//     email: "",
//     leadSource: "",
//     notes: "",
//     lastContactedAt: "",
//     nextFollowUpAt: "",
//     tags: [], // Now array of tag IDs
//   });

//   const [allTags, setAllTags] = useState([]);

//   useEffect(() => {
//     // Load all tags from DB
//     axios
//       .get("/api/tags")
//       .then(res => setAllTags(res.data))
//       .catch(() => toast.error("❌ Failed to load tags"));
//   }, []);

//   useEffect(() => {
//     if (contact) {
//       setFormData({
//         name: contact.name || "",
//         phoneNumber: contact.phoneNumber || "",
//         email: contact.email || "",
//         leadSource: contact.leadSource || "",
//         notes: contact.notes || "",
//         lastContactedAt: contact.lastContactedAt || "",
//         nextFollowUpAt: contact.nextFollowUpAt || "",
//         tags: contact.tags?.map(t => t.tagId) || [],
//       });
//     }
//   }, [contact]);

//   const handleChange = e => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleTagChange = e => {
//     const selected = Array.from(e.target.selectedOptions, opt => opt.value);
//     setFormData(prev => ({ ...prev, tags: selected }));
//   };

//   const handleSubmit = async e => {
//     e.preventDefault();

//     const mappedTags = formData.tags.map(id => {
//       const tag = allTags.find(t => t.id === id);
//       return { tagId: tag.id, tagName: tag.name };
//     });

//     const payload = {
//       ...formData,
//       tags: mappedTags,
//     };

//     try {
//       if (contact?.id) {
//         await axios.put(`/contacts/${contact.id}`, payload);
//         toast.success("✅ Contact updated");
//       } else {
//         await axios.post("/contacts", payload);
//         toast.success("✅ Contact added");
//       }

//       onSaveComplete?.();
//     } catch (err) {
//       console.error(err);
//       toast.error("❌ Failed to save contact");
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-3">
//       <input
//         name="name"
//         value={formData.name}
//         onChange={handleChange}
//         required
//         placeholder="Name"
//         className="w-full border px-3 py-2 rounded"
//       />
//       <input
//         name="phoneNumber"
//         value={formData.phoneNumber}
//         onChange={handleChange}
//         required
//         placeholder="Phone"
//         className="w-full border px-3 py-2 rounded"
//       />
//       <input
//         name="email"
//         value={formData.email}
//         onChange={handleChange}
//         placeholder="Email"
//         className="w-full border px-3 py-2 rounded"
//       />
//       <input
//         name="leadSource"
//         value={formData.leadSource}
//         onChange={handleChange}
//         placeholder="Lead Source"
//         className="w-full border px-3 py-2 rounded"
//       />

//       {/* ✅ Tag Select */}
//       <select
//         multiple
//         value={formData.tags}
//         onChange={handleTagChange}
//         className="w-full border px-3 py-2 rounded"
//       >
//         {allTags.map(tag => (
//           <option key={tag.id} value={tag.id}>
//             {tag.name}
//           </option>
//         ))}
//       </select>

//       <input
//         type="datetime-local"
//         name="lastContactedAt"
//         value={formData.lastContactedAt}
//         onChange={handleChange}
//         className="w-full border px-3 py-2 rounded"
//       />
//       <input
//         type="datetime-local"
//         name="nextFollowUpAt"
//         value={formData.nextFollowUpAt}
//         onChange={handleChange}
//         className="w-full border px-3 py-2 rounded"
//       />
//       <textarea
//         name="notes"
//         value={formData.notes}
//         onChange={handleChange}
//         placeholder="Notes"
//         className="w-full border px-3 py-2 rounded"
//       />

//       <button
//         type="submit"
//         className="bg-purple-600 text-white px-4 py-2 rounded"
//       >
//         {contact?.id ? "Update Contact" : "Add Contact"}
//       </button>
//     </form>
//   );
// }

// export default ContactForm;
