import React, { useEffect, useState } from "react";
import axiosClient from "../../../../api/axiosClient";
import { toast } from "react-toastify";
import TagSelector from "../../Tags/TagSelector";
import CustomFieldsEditor from "../../../CustomFields/CustomFieldsEditor";

const leadSources = [
  "Manual",
  "Website Form",
  "Google Search",
  "Facebook Ad",
  "LinkedIn",
  "Referral",
  "Trade Show",
  "Cold Call",
  "Other",
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ContactFormModal({ isOpen, onClose, contact, onSaveComplete }) {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    leadSource: "Manual",
    notes: "",
    tagIds: [],
  });
  const [allTags, setAllTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState({
    phoneNumber: false,
    email: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const normalizePhoneValue = value => {
    let digits = value.replace(/\D/g, "");
    if (digits.length > 10 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    if (digits.length > 10 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits.slice(0, 10);
  };

  const getPhoneError = value => {
    if (!value) return "Mobile number is required.";
    if (value.length !== 10) {
      return "Mobile number must be exactly 10 digits.";
    }
    return "";
  };

  const getEmailError = value => {
    if (!value) return "";
    return emailRegex.test(value)
      ? ""
      : "Please enter a valid email address.";
  };

  const phoneError = getPhoneError(formData.phoneNumber);
  const emailError = getEmailError(formData.email);
  const canSubmit = !phoneError && !emailError;

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await axiosClient.get("/tags");
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setAllTags(list);
      } catch (error) {
        console.error("Failed to load tags:", error);
        toast.error("Failed to load tags.");
      }
    };

    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  useEffect(() => {
    if (contact) {
      const existing =
        contact.tags ||
        contact.contactTags ||
        contact.tagSummaries ||
        contact.tagList ||
        [];
      const tagIds = Array.isArray(existing)
        ? existing.map(t => t.tagId || t.id).filter(Boolean)
        : [];
      setFormData({
        name: contact.name || "",
        phoneNumber: normalizePhoneValue(contact.phoneNumber || ""),
        email: contact.email || "",
        leadSource: contact.leadSource || "Manual",
        notes: contact.notes || "",
        tagIds,
      });
    } else {
      setFormData({
        name: "",
        phoneNumber: "",
        email: "",
        leadSource: "Manual",
        notes: "",
        tagIds: [],
      });
    }
    setTouched({ phoneNumber: false, email: false });
    setSubmitAttempted(false);
  }, [contact, isOpen]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = e => {
    const normalizedValue = normalizePhoneValue(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: normalizedValue }));
    setTouched(prev => ({ ...prev, phoneNumber: true }));
  };

  const handleEmailChange = e => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, email: value }));
    setTouched(prev => ({ ...prev, email: true }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!canSubmit) {
      toast.error(phoneError || emailError);
      return;
    }

    setIsSaving(true);

    const payload = {
      ...formData,
      tagIds: formData.tagIds,
    };

    try {
      if (contact?.id) {
        await axiosClient.put(`/contacts/${contact.id}`, payload); // Assuming PUT doesn't need "add"
        toast.success("✅ Contact updated successfully!");
      } else {
        // 👇 FIX #1: Using the correct endpoint for creating a contact.
        await axiosClient.post("/contacts/create", payload);
        toast.success("✅ Contact created successfully!");
      }
      onSaveComplete?.();
      onClose();
    } catch (err) {
      // 👇 FIX #2: Specific error handling for duplicate contacts.
      if (err.response && err.response.status === 409) {
        // 409 Conflict status means the contact already exists.
        toast.warn(
          err.response.data.message ||
            "Contact with this phone number already exists."
        );
      } else {
        // Handle all other errors (like 404 Not Found, 500 Server Error, etc.)
        const errorMessage =
          err.response?.data?.message || "Failed to save contact.";
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-2xl"
        >
          &times;
        </button>

        <h2 className="text-xl font-bold mb-4">
          {contact?.id ? "Edit Contact" : "Add New Contact"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name *"
            required
            className="border px-3 py-2 rounded w-full"
          />
          <div className="space-y-1">
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              placeholder="Phone Number *"
              required
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
              className="border px-3 py-2 rounded w-full"
            />
            {(touched.phoneNumber || submitAttempted) && phoneError && (
              <p className="text-[11px] text-rose-600">{phoneError}</p>
            )}
          </div>
          <div className="space-y-1">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="Email"
              className="border px-3 py-2 rounded w-full"
            />
            {(touched.email || submitAttempted) && emailError && (
              <p className="text-[11px] text-rose-600">{emailError}</p>
            )}
          </div>
          <select
            name="leadSource"
            value={formData.leadSource}
            onChange={handleChange}
            className="border px-3 py-2 rounded w-full"
          >
            {leadSources.map(source => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <div className="md:col-span-2 space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Tags (optional)
            </label>
            {allTags.length === 0 ? (
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                <span>
                  No tags yet. Create a tag first to segment contacts.
                </span>
                <button
                  type="button"
                  onClick={() => window.open("/app/crm/tags", "_blank")}
                  className="text-emerald-700 font-semibold hover:text-emerald-800 whitespace-nowrap"
                >
                  Create tag
                </button>
              </div>
            ) : (
              <TagSelector
                tags={allTags}
                selected={formData.tagIds}
                onChange={ids =>
                  setFormData(prev => ({ ...prev, tagIds: ids }))
                }
                multi
              />
            )}
            {!contact?.id && allTags.length > 0 && (
              <p className="text-[11px] text-slate-500">
                Tags are optional. You can add them now or later.
              </p>
            )}
          </div>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notes..."
            className="md:col-span-2 border px-3 py-2 rounded w-full min-h-[80px]"
          ></textarea>

          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Attributes
              </h3>
              <span className="text-[11px] text-slate-400">
                CRM contact attributes
              </span>
            </div>

            {contact?.id ? (
              <CustomFieldsEditor
                entityType="Contact"
                entityId={contact.id}
                mode="edit"
              />
            ) : (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Save contact first to set attributes.
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !canSubmit}
              className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700 disabled:bg-emerald-300"
            >
              {isSaving
                ? "Saving..."
                : contact?.id
                ? "Update Contact"
                : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContactFormModal;

// import React, { useEffect, useState } from "react";
// import axiosClient from "../../../api/axiosClient";
// import { toast } from "react-toastify";

// // 👇 FIX #1: Define the list of lead sources.
// const leadSources = [
//   "Manual",
//   "Website Form",
//   "Google Search",
//   "Facebook Ad",
//   "LinkedIn",
//   "Referral",
//   "Trade Show",
//   "Cold Call",
//   "Other",
// ];

// function ContactFormModal({ isOpen, onClose, contact, onSaveComplete }) {
//   const [formData, setFormData] = useState({
//     name: "",
//     phoneNumber: "",
//     email: "",
//     // 👇 FIX #2: Set the default leadSource to "Manual".
//     leadSource: "Manual",
//     notes: "",
//     tagId: "",
//   });
//   const [allTags, setAllTags] = useState([]);
//   const [isSaving, setIsSaving] = useState(false);

//   useEffect(() => {
//     const fetchTags = async () => {
//       try {
//         const res = await axiosClient.get("/tags/get-tags");
//         setAllTags(res.data.data || []);
//       } catch (error) {
//         console.error("Failed to load tags:", error);
//         toast.error("❌ Failed to load tags");
//       }
//     };

//     if (isOpen) {
//       fetchTags();
//     }
//   }, [isOpen]);

//   useEffect(() => {
//     if (contact) {
//       setFormData({
//         name: contact.name || "",
//         phoneNumber: contact.phoneNumber || "",
//         email: contact.email || "",
//         leadSource: contact.leadSource || "Manual",
//         notes: contact.notes || "",
//         tagId: contact.tags?.[0]?.tagId || "",
//       });
//     } else {
//       // Reset form for a new contact
//       setFormData({
//         name: "",
//         phoneNumber: "",
//         email: "",
//         leadSource: "Manual",
//         notes: "",
//         tagId: "",
//       });
//     }
//   }, [contact, isOpen]);

//   const handleChange = e => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async e => {
//     e.preventDefault();
//     setIsSaving(true);

//     const payload = {
//       ...formData,
//       tagIds: formData.tagId ? [formData.tagId] : [],
//     };
//     delete payload.tagId;

//     try {
//       if (contact?.id) {
//         await axiosClient.put(`/contacts/add/${contact.id}`, payload);
//         toast.success("✅ Contact updated successfully!");
//       } else {
//         await axiosClient.post("/contacts", payload);
//         toast.success("✅ Contact created successfully!");
//       }
//       onSaveComplete?.();
//       onClose();
//     } catch (err) {
//       const errorMessage =
//         err.response?.data?.message || "❌ Failed to save contact.";
//       toast.error(errorMessage);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
//       <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl relative">
//         <button
//           onClick={onClose}
//           className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-2xl"
//         >
//           &times;
//         </button>

//         <h2 className="text-xl font-bold mb-4">
//           {contact?.id ? "Edit Contact" : "Add New Contact"}
//         </h2>

//         <form
//           onSubmit={handleSubmit}
//           className="grid grid-cols-1 md:grid-cols-2 gap-4"
//         >
//           <input
//             name="name"
//             value={formData.name}
//             onChange={handleChange}
//             placeholder="Full Name *"
//             required
//             className="border px-3 py-2 rounded w-full"
//           />
//           <input
//             name="phoneNumber"
//             value={formData.phoneNumber}
//             onChange={handleChange}
//             placeholder="Phone Number *"
//             required
//             className="border px-3 py-2 rounded w-full"
//           />
//           <input
//             type="email"
//             name="email"
//             value={formData.email}
//             onChange={handleChange}
//             placeholder="Email"
//             className="border px-3 py-2 rounded w-full"
//           />

//           {/* 👇 FIX #3: Replaced the text input with a select dropdown. */}
//           <select
//             name="leadSource"
//             value={formData.leadSource}
//             onChange={handleChange}
//             className="border px-3 py-2 rounded w-full"
//           >
//             {leadSources.map(source => (
//               <option key={source} value={source}>
//                 {source}
//               </option>
//             ))}
//           </select>

//           <select
//             name="tagId"
//             value={formData.tagId}
//             onChange={handleChange}
//             className="md:col-span-2 border px-3 py-2 rounded w-full"
//           >
//             <option value="">-- No Tag --</option>
//             {allTags.map(tag => (
//               <option key={tag.id} value={tag.id}>
//                 {tag.name}
//               </option>
//             ))}
//           </select>

//           <textarea
//             name="notes"
//             value={formData.notes}
//             onChange={handleChange}
//             placeholder="Notes..."
//             className="md:col-span-2 border px-3 py-2 rounded w-full min-h-[80px]"
//           ></textarea>

//           <div className="md:col-span-2 flex justify-end gap-3">
//             <button
//               type="button"
//               onClick={onClose}
//               className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={isSaving}
//               className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300"
//             >
//               {isSaving
//                 ? "Saving..."
//                 : contact?.id
//                 ? "Update Contact"
//                 : "Add Contact"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default ContactFormModal;
