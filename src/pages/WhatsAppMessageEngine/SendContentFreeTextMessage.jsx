import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

// 📦 Token-style phone number input
function PhoneNumberInput({ numbers, setNumbers }) {
  const [input, setInput] = useState("");

  const handleInputChange = e => {
    const value = e.target.value;
    const lastChar = value.slice(-1);
    const isSeparator = /[\n, ]/.test(lastChar);

    if (isSeparator) {
      tryAddPhone(input.trim());
      setInput("");
    } else {
      setInput(value);
    }
  };

  const tryAddPhone = value => {
    let normalized = value.replace(/[^0-9+]/g, "");

    // Auto-add +91 if it's a 10-digit number and no +
    if (/^\d{10}$/.test(normalized)) {
      normalized = "+91" + normalized;
    }

    // Accept if it's a valid E.164 format (10–15 digits with optional +)
    if (/^\+?\d{10,15}$/.test(normalized)) {
      if (!numbers.includes(normalized)) {
        setNumbers([...numbers, normalized]);
      }
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      tryAddPhone(input.trim());
      setInput("");
      e.preventDefault();
    } else if (e.key === "Backspace" && input === "") {
      setNumbers(numbers.slice(0, -1));
    }
  };

  const removeNumber = num => {
    setNumbers(numbers.filter(n => n !== num));
  };

  return (
    <div className="w-full border rounded-xl p-2 flex flex-wrap gap-2 min-h-[60px] bg-white shadow-sm">
      {numbers.map((num, idx) => (
        <span
          key={idx}
          className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
        >
          {num}
          <button
            type="button"
            className="ml-2 text-blue-600 hover:text-red-500"
            onClick={() => removeNumber(num)}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        className="flex-grow p-1 text-sm outline-none"
        placeholder="Type or paste numbers..."
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default function SendTextMessagePage() {
  const [manualNumbers, setManualNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [messageLogs, setMessageLogs] = useState([]);
  const [saveContact, setSaveContact] = useState(false); // ✅ toggle state
  const navigate = useNavigate();

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await axiosClient.get("/contacts/");
        setContacts(res.data?.data?.items || []);
      } catch (err) {
        console.error("❌ Error loading contacts", err);
        toast.error("Failed to load contacts.");
      }
    };

    const loadHistory = async () => {
      try {
        const res = await axiosClient.get(
          "/reporting/messages/recent?limit=10"
        );
        setMessageLogs(res.data?.data || []);
      } catch (err) {
        console.error("❌ Error loading history", err);
      }
    };

    loadContacts();
    loadHistory();
  }, []);

  const numbers = [...new Set([...manualNumbers, ...selectedNumbers])];

  const handleSend = async () => {
    if (!message || numbers.length === 0) {
      toast.warn("⚠️ Please enter a message and at least one valid number.");
      return;
    }

    setSubmitting(true);
    let success = 0,
      failed = 0;

    for (const number of numbers) {
      try {
        const res = await axiosClient.post(
          "/messageengine/send-contentfree-text",
          {
            recipientNumber: number,
            textContent: message,
            isSaveContact: saveContact, // ✅ pass toggle value
          }
        );
        res.data?.success ? success++ : failed++;
      } catch (err) {
        failed++;
        console.error("Send failed:", number, err);
      }
    }

    toast.success(`✅ Sent: ${success}, ❌ Failed: ${failed}`);
    setSubmitting(false);
  };

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-purple-700">
          📤 Send WhatsApp Message
        </h2>
        <button
          onClick={() => navigate("/messages/history")}
          className="text-sm text-blue-600 hover:underline"
        >
          🔍 View Full History
        </button>
      </div>

      {/* 🎯 Target Audience */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 📇 Select from Contacts */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">
            📇 Select Contacts
          </h3>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {contacts.length > 0 ? (
              contacts.map(contact => (
                <div key={contact.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={contact.phoneNumber}
                    checked={selectedNumbers.includes(contact.phoneNumber)}
                    onChange={e => {
                      const value = e.target.value;
                      setSelectedNumbers(prev =>
                        e.target.checked
                          ? [...prev, value]
                          : prev.filter(n => n !== value)
                      );
                    }}
                  />
                  <label className="text-sm text-gray-700">
                    {contact.name} ({contact.phoneNumber})
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">
                No contacts available.
              </p>
            )}
          </div>
        </div>

        {/* ✍️ Manual Entry */}
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block font-semibold text-gray-800 mb-2">
            ✍️ Manual Numbers
          </label>
          <PhoneNumberInput
            numbers={manualNumbers}
            setNumbers={setManualNumbers}
          />

          {/* ✅ Toggle Save Contact (specific to manual numbers) */}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              id="saveContact"
              checked={saveContact}
              onChange={e => setSaveContact(e.target.checked)}
            />
            <label htmlFor="saveContact" className="text-sm text-gray-700">
              Save manual numbers to Contacts after sending
            </label>
          </div>
        </div>
      </div>

      {/* 💬 Message Input */}
      <div className="bg-white rounded-xl shadow p-4">
        <label className="block font-semibold text-gray-800 mb-2">
          💬 Message
        </label>
        <textarea
          rows={4}
          className="w-full p-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Write your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </div>

      {/* 🔘 Send Button */}
      <div className="text-right">
        <button
          onClick={handleSend}
          disabled={submitting}
          className={`px-6 py-3 font-semibold rounded-xl transition ${
            submitting
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {submitting ? "Sending..." : `Send to ${numbers.length} Recipient(s)`}
        </button>
      </div>

      {/* 🕓 Recent Sent Messages */}
      <div className="bg-white mt-6 p-4 rounded-xl shadow">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">
          🕓 Recent Sent Messages
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sent At</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {messageLogs.length > 0 ? (
                messageLogs.map(log => {
                  const isSuccess =
                    log.status &&
                    ["success", "sent", "delivered"].includes(
                      log.status.toLowerCase()
                    );

                  return (
                    <tr key={log.id} className="border-b">
                      <td className="px-3 py-2">{log.recipientNumber}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isSuccess
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {log.sentAt
                          ? new Date(log.sentAt).toLocaleString()
                          : "—"}
                      </td>
                      <td
                        className="px-3 py-2 max-w-[250px] truncate"
                        title={log.messageContent}
                      >
                        {log.messageContent || "(empty)"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center text-gray-500 py-4">
                    No messages sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}

// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // 📦 Token-style phone number input
// function PhoneNumberInput({ numbers, setNumbers }) {
//   const [input, setInput] = useState("");

//   const handleInputChange = e => {
//     const value = e.target.value;
//     const lastChar = value.slice(-1);
//     const isSeparator = /[\n, ]/.test(lastChar);

//     if (isSeparator) {
//       tryAddPhone(input.trim());
//       setInput("");
//     } else {
//       setInput(value);
//     }
//   };

//   const tryAddPhone = value => {
//     let normalized = value.replace(/[^0-9+]/g, "");

//     // Auto-add +91 if it's a 10-digit number and no +
//     if (/^\d{10}$/.test(normalized)) {
//       normalized = "+91" + normalized;
//     }

//     // Accept if it's a valid E.164 format (10–15 digits with optional +)
//     if (/^\+?\d{10,15}$/.test(normalized)) {
//       if (!numbers.includes(normalized)) {
//         setNumbers([...numbers, normalized]);
//       }
//     }
//   };

//   const handleKeyDown = e => {
//     if (e.key === "Enter") {
//       tryAddPhone(input.trim());
//       setInput("");
//       e.preventDefault();
//     } else if (e.key === "Backspace" && input === "") {
//       setNumbers(numbers.slice(0, -1));
//     }
//   };

//   const removeNumber = num => {
//     setNumbers(numbers.filter(n => n !== num));
//   };

//   return (
//     <div className="w-full border rounded-xl p-2 flex flex-wrap gap-2 min-h-[60px] bg-white shadow-sm">
//       {numbers.map((num, idx) => (
//         <span
//           key={idx}
//           className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
//         >
//           {num}
//           <button
//             type="button"
//             className="ml-2 text-blue-600 hover:text-red-500"
//             onClick={() => removeNumber(num)}
//           >
//             &times;
//           </button>
//         </span>
//       ))}
//       <input
//         type="text"
//         className="flex-grow p-1 text-sm outline-none"
//         placeholder="Type or paste numbers..."
//         value={input}
//         onChange={handleInputChange}
//         onKeyDown={handleKeyDown}
//       />
//     </div>
//   );
// }

// export default function SendTextMessagePage() {
//   const [manualNumbers, setManualNumbers] = useState([]);
//   const [selectedNumbers, setSelectedNumbers] = useState([]);
//   const [contacts, setContacts] = useState([]);
//   const [message, setMessage] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [messageLogs, setMessageLogs] = useState([]);
//   const [saveContact, setSaveContact] = useState(false); // ✅ toggle state
//   const navigate = useNavigate();

//   useEffect(() => {
//     const loadContacts = async () => {
//       try {
//         const res = await axiosClient.get("/contacts/");
//         setContacts(res.data?.data?.items || []);
//       } catch (err) {
//         console.error("❌ Error loading contacts", err);
//         toast.error("Failed to load contacts.");
//       }
//     };

//     const loadHistory = async () => {
//       try {
//         const res = await axiosClient.get(
//           "/reporting/messages/recent?limit=10"
//         );
//         setMessageLogs(res.data?.data || []);
//       } catch (err) {
//         console.error("❌ Error loading history", err);
//       }
//     };

//     loadContacts();
//     loadHistory();
//   }, []);

//   const numbers = [...new Set([...manualNumbers, ...selectedNumbers])];

//   const handleSend = async () => {
//     if (!message || numbers.length === 0) {
//       toast.warn("⚠️ Please enter a message and at least one valid number.");
//       return;
//     }

//     setSubmitting(true);
//     let success = 0,
//       failed = 0;

//     for (const number of numbers) {
//       try {
//         const res = await axiosClient.post(
//           "/messageengine/send-contentfree-text",
//           {
//             recipientNumber: number,
//             textContent: message,
//             isSaveContact: saveContact, // ✅ pass toggle value
//           }
//         );
//         res.data?.success ? success++ : failed++;
//       } catch (err) {
//         failed++;
//         console.error("Send failed:", number, err);
//       }
//     }

//     toast.success(`✅ Sent: ${success}, ❌ Failed: ${failed}`);
//     setSubmitting(false);
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6 space-y-6">
//       <div className="flex items-center justify-between">
//         <h2 className="text-2xl font-bold text-purple-700">
//           📤 Send WhatsApp Message
//         </h2>
//         <button
//           onClick={() => navigate("/messages/history")}
//           className="text-sm text-blue-600 hover:underline"
//         >
//           🔍 View Full History
//         </button>
//       </div>

//       {/* 🎯 Target Audience */}
//       <div className="grid md:grid-cols-2 gap-6">
//         {/* 📇 Select from Contacts */}
//         <div className="bg-white rounded-xl shadow p-4">
//           <h3 className="font-semibold text-gray-800 mb-2">
//             📇 Select Contacts
//           </h3>
//           <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
//             {contacts.length > 0 ? (
//               contacts.map(contact => (
//                 <div key={contact.id} className="flex items-center gap-2">
//                   <input
//                     type="checkbox"
//                     value={contact.phoneNumber}
//                     checked={selectedNumbers.includes(contact.phoneNumber)}
//                     onChange={e => {
//                       const value = e.target.value;
//                       setSelectedNumbers(prev =>
//                         e.target.checked
//                           ? [...prev, value]
//                           : prev.filter(n => n !== value)
//                       );
//                     }}
//                   />
//                   <label className="text-sm text-gray-700">
//                     {contact.name} ({contact.phoneNumber})
//                   </label>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500 italic">
//                 No contacts available.
//               </p>
//             )}
//           </div>
//         </div>

//         {/* ✍️ Manual Entry */}
//         {/* <div className="bg-white rounded-xl shadow p-4">
//           <label className="block font-semibold text-gray-800 mb-2">
//             ✍️ Manual Numbers
//           </label>
//           <PhoneNumberInput
//             numbers={manualNumbers}
//             setNumbers={setManualNumbers}
//           />
//         </div> */}
//         {/* ✍️ Manual Entry */}
//         <div className="bg-white rounded-xl shadow p-4">
//           <label className="block font-semibold text-gray-800 mb-2">
//             ✍️ Manual Numbers
//           </label>
//           <PhoneNumberInput
//             numbers={manualNumbers}
//             setNumbers={setManualNumbers}
//           />

//           {/* ✅ Toggle Save Contact (specific to manual numbers) */}
//           <div className="flex items-center gap-2 mt-3">
//             <input
//               type="checkbox"
//               id="saveContact"
//               checked={saveContact}
//               onChange={e => setSaveContact(e.target.checked)}
//             />
//             <label htmlFor="saveContact" className="text-sm text-gray-700">
//               Save manual numbers to Contacts after sending
//             </label>
//           </div>
//         </div>
//       </div>

//       {/* 💬 Message Input */}
//       <div className="bg-white rounded-xl shadow p-4">
//         <label className="block font-semibold text-gray-800 mb-2">
//           💬 Message
//         </label>
//         <textarea
//           rows={4}
//           className="w-full p-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
//           placeholder="Write your message..."
//           value={message}
//           onChange={e => setMessage(e.target.value)}
//         />
//       </div>

//       {/* 🔘 Send Button */}
//       <div className="text-right">
//         <button
//           onClick={handleSend}
//           disabled={submitting}
//           className={`px-6 py-3 font-semibold rounded-xl transition ${
//             submitting
//               ? "bg-gray-400 cursor-not-allowed text-white"
//               : "bg-green-600 text-white hover:bg-green-700"
//           }`}
//         >
//           {submitting ? "Sending..." : `Send to ${numbers.length} Recipient(s)`}
//         </button>
//       </div>

//       {/* 🕓 Recent Sent Messages */}
//       <div className="bg-white mt-6 p-4 rounded-xl shadow">
//         <h3 className="font-semibold text-lg text-gray-800 mb-4">
//           🕓 Recent Sent Messages
//         </h3>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm text-left border">
//             <thead className="bg-gray-100 text-gray-700">
//               <tr>
//                 <th className="px-3 py-2">Recipient</th>
//                 <th className="px-3 py-2">Status</th>
//                 <th className="px-3 py-2">Sent At</th>
//                 <th className="px-3 py-2">Message</th>
//               </tr>
//             </thead>
//             <tbody>
//               {messageLogs.length > 0 ? (
//                 messageLogs.map(log => (
//                   <tr key={log.id} className="border-b">
//                     <td className="px-3 py-2">{log.recipientNumber}</td>
//                     <td className="px-3 py-2">
//                       <span
//                         className={`px-2 py-1 rounded-full text-xs font-medium ${
//                           log.status === "Success"
//                             ? "bg-green-100 text-green-700"
//                             : "bg-red-100 text-red-600"
//                         }`}
//                       >
//                         {log.status}
//                       </span>
//                     </td>
//                     <td className="px-3 py-2">
//                       {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
//                     </td>
//                     <td
//                       className="px-3 py-2 max-w-[250px] truncate"
//                       title={log.messageContent}
//                     >
//                       {log.messageContent || "(empty)"}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="4" className="text-center text-gray-500 py-4">
//                     No messages sent yet.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// // 📦 Token-style phone number input
// function PhoneNumberInput({ numbers, setNumbers }) {
//   const [input, setInput] = useState("");

//   const handleInputChange = e => {
//     const value = e.target.value;
//     const lastChar = value.slice(-1);
//     const isSeparator = /[\n, ]/.test(lastChar);

//     if (isSeparator) {
//       tryAddPhone(input.trim());
//       setInput("");
//     } else {
//       setInput(value);
//     }
//   };

//   const tryAddPhone = value => {
//     let normalized = value.replace(/[^0-9+]/g, "");

//     // Auto-add +91 if it's a 10-digit number and no +
//     if (/^\d{10}$/.test(normalized)) {
//       normalized = "+91" + normalized;
//     }

//     // Accept if it's a valid E.164 format (10–15 digits with optional +)
//     if (/^\+?\d{10,15}$/.test(normalized)) {
//       if (!numbers.includes(normalized)) {
//         setNumbers([...numbers, normalized]);
//       }
//     }
//   };

//   const handleKeyDown = e => {
//     if (e.key === "Enter") {
//       tryAddPhone(input.trim());
//       setInput("");
//       e.preventDefault();
//     } else if (e.key === "Backspace" && input === "") {
//       setNumbers(numbers.slice(0, -1));
//     }
//   };

//   const removeNumber = num => {
//     setNumbers(numbers.filter(n => n !== num));
//   };

//   return (
//     <div className="w-full border rounded-xl p-2 flex flex-wrap gap-2 min-h-[60px] bg-white shadow-sm">
//       {numbers.map((num, idx) => (
//         <span
//           key={idx}
//           className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
//         >
//           {num}
//           <button
//             type="button"
//             className="ml-2 text-blue-600 hover:text-red-500"
//             onClick={() => removeNumber(num)}
//           >
//             &times;
//           </button>
//         </span>
//       ))}
//       <input
//         type="text"
//         className="flex-grow p-1 text-sm outline-none"
//         placeholder="Type or paste numbers..."
//         value={input}
//         onChange={handleInputChange}
//         onKeyDown={handleKeyDown}
//       />
//     </div>
//   );
// }

// export default function SendTextMessagePage() {
//   const [manualNumbers, setManualNumbers] = useState([]);
//   const [selectedNumbers, setSelectedNumbers] = useState([]);
//   const [contacts, setContacts] = useState([]);
//   const [message, setMessage] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [messageLogs, setMessageLogs] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const loadContacts = async () => {
//       try {
//         const res = await axiosClient.get("/contacts");
//         setContacts(res.data?.data?.items || []);
//       } catch (err) {
//         console.error("❌ Error loading contacts", err);
//         toast.error("Failed to load contacts.");
//       }
//     };

//     const loadHistory = async () => {
//       try {
//         const res = await axiosClient.get(
//           "/reporting/messages/recent?limit=10"
//         );
//         setMessageLogs(res.data?.data || []);
//       } catch (err) {
//         console.error("❌ Error loading history", err);
//       }
//     };

//     loadContacts();
//     loadHistory();
//   }, []);

//   const numbers = [...new Set([...manualNumbers, ...selectedNumbers])];

//   const handleSend = async () => {
//     if (!message || numbers.length === 0) {
//       toast.warn("⚠️ Please enter a message and at least one valid number.");
//       return;
//     }

//     setSubmitting(true);
//     let success = 0,
//       failed = 0;

//     for (const number of numbers) {
//       try {
//         const res = await axiosClient.post(
//           "/messageengine/send-contentfree-text",
//           {
//             recipientNumber: number,
//             textContent: message,
//           }
//         );
//         res.data?.success ? success++ : failed++;
//       } catch (err) {
//         failed++;
//         console.error("Send failed:", number, err);
//       }
//     }

//     toast.success(`✅ Sent: ${success}, ❌ Failed: ${failed}`);
//     setSubmitting(false);
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6 space-y-6">
//       <div className="flex items-center justify-between">
//         <h2 className="text-2xl font-bold text-purple-700">
//           📤 Send WhatsApp Message
//         </h2>
//         <button
//           onClick={() => navigate("/messages/history")}
//           className="text-sm text-blue-600 hover:underline"
//         >
//           🔍 View Full History
//         </button>
//       </div>

//       {/* 🎯 Target Audience */}
//       <div className="grid md:grid-cols-2 gap-6">
//         {/* 📇 Select from Contacts */}
//         <div className="bg-white rounded-xl shadow p-4">
//           <h3 className="font-semibold text-gray-800 mb-2">
//             📇 Select Contacts
//           </h3>
//           <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
//             {contacts.length > 0 ? (
//               contacts.map(contact => (
//                 <div key={contact.id} className="flex items-center gap-2">
//                   <input
//                     type="checkbox"
//                     value={contact.phoneNumber}
//                     checked={selectedNumbers.includes(contact.phoneNumber)}
//                     onChange={e => {
//                       const value = e.target.value;
//                       setSelectedNumbers(prev =>
//                         e.target.checked
//                           ? [...prev, value]
//                           : prev.filter(n => n !== value)
//                       );
//                     }}
//                   />
//                   <label className="text-sm text-gray-700">
//                     {contact.name} ({contact.phoneNumber})
//                   </label>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500 italic">
//                 No contacts available.
//               </p>
//             )}
//           </div>
//         </div>

//         {/* ✍️ Manual Entry */}
//         <div className="bg-white rounded-xl shadow p-4">
//           <label className="block font-semibold text-gray-800 mb-2">
//             ✍️ Manual Numbers
//           </label>
//           <PhoneNumberInput
//             numbers={manualNumbers}
//             setNumbers={setManualNumbers}
//           />
//         </div>
//       </div>

//       {/* 💬 Message Input */}
//       <div className="bg-white rounded-xl shadow p-4">
//         <label className="block font-semibold text-gray-800 mb-2">
//           💬 Message
//         </label>
//         <textarea
//           rows={4}
//           className="w-full p-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
//           placeholder="Write your message..."
//           value={message}
//           onChange={e => setMessage(e.target.value)}
//         />
//       </div>

//       {/* 🔘 Send Button */}
//       <div className="text-right">
//         <button
//           onClick={handleSend}
//           disabled={submitting}
//           className={`px-6 py-3 font-semibold rounded-xl transition ${
//             submitting
//               ? "bg-gray-400 cursor-not-allowed text-white"
//               : "bg-green-600 text-white hover:bg-green-700"
//           }`}
//         >
//           {submitting ? "Sending..." : `Send to ${numbers.length} Recipient(s)`}
//         </button>
//       </div>

//       {/* 🕓 Recent Sent Messages */}
//       <div className="bg-white mt-6 p-4 rounded-xl shadow">
//         <h3 className="font-semibold text-lg text-gray-800 mb-4">
//           🕓 Recent Sent Messages
//         </h3>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm text-left border">
//             <thead className="bg-gray-100 text-gray-700">
//               <tr>
//                 <th className="px-3 py-2">Recipient</th>
//                 <th className="px-3 py-2">Status</th>
//                 <th className="px-3 py-2">Sent At</th>
//                 <th className="px-3 py-2">Message</th>
//               </tr>
//             </thead>
//             <tbody>
//               {messageLogs.length > 0 ? (
//                 messageLogs.map(log => (
//                   <tr key={log.id} className="border-b">
//                     <td className="px-3 py-2">{log.recipientNumber}</td>
//                     <td className="px-3 py-2">
//                       <span
//                         className={`px-2 py-1 rounded-full text-xs font-medium ${
//                           log.status === "Success"
//                             ? "bg-green-100 text-green-700"
//                             : "bg-red-100 text-red-600"
//                         }`}
//                       >
//                         {log.status}
//                       </span>
//                     </td>
//                     <td className="px-3 py-2">
//                       {log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}
//                     </td>
//                     <td
//                       className="px-3 py-2 max-w-[250px] truncate"
//                       title={log.messageContent}
//                     >
//                       {log.messageContent || "(empty)"}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="4" className="text-center text-gray-500 py-4">
//                     No messages sent yet.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }
