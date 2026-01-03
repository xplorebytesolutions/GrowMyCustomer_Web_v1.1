import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  User, 
  Phone, 
  Globe, 
  MapPin, 
  Tag, 
  Link as LinkIcon, 
  CheckCircle2, 
  Briefcase,
  Image as ImageIcon
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const businessId = localStorage.getItem("businessId");

  const [form, setForm] = useState({
    companyName: "",
    representativeName: "",
    phone: "",
    companyPhone: "",
    country: "",
    website: "",
    address: "",
    industry: "",
    logoUrl: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Validation rules (unchanged)
  const fields = [
    [
      "Company Name",
      "companyName",
      "text",
      { required: true, minLength: 2, maxLength: 150 },
    ],
    [
      "Representative Name",
      "representativeName",
      "text",
      { required: true, minLength: 2, maxLength: 100 },
    ],
    [
      "Phone",
      "phone",
      "text",
      {
        required: true,
        pattern: /^\d{1,10}$/,
        title: "Enter a valid phone number (up to 10 digits)",
      },
    ],
    [
      "Company Phone",
      "companyPhone",
      "text",
      {
        required: true,
        pattern: /^\d{1,10}$/,
        title: "Enter a valid company phone number (up to 10 digits)",
      },
    ],
    ["Country", "country", "text", { required: false, maxLength: 100 }],
    [
      "Website",
      "website",
      "text",
      {
        required: false,
        pattern: /^www\..*/,
        title: "Website should start with www.",
      },
    ],
    ["Address", "address", "text", { required: false, maxLength: 250 }],
    ["Industry", "industry", "text", { required: false, maxLength: 100 }],
    [
      "Logo URL",
      "logoUrl",
      "text",
      {
        required: false,
        pattern: /^(https?:\/\/)?([\w-]+\.)+[\w-]+.*$/,
        title: "Enter a valid URL",
      },
    ],
  ];

  useEffect(() => {
    if (!businessId) return;

    fetch(`${API_BASE}/businesses/${businessId}`)
      .then(res =>
        res.ok ? res.json() : Promise.reject("Failed to fetch profile")
      )
      .then(data => {
        setForm({
          companyName: data.companyName ?? data.businessName ?? "",
          representativeName: data.representativeName ?? "",
          phone: data.phone ?? "",
          companyPhone: data.companyPhone ?? "",
          country: data.country ?? "",
          website: data.website ?? "",
          address: data.address ?? "",
          industry: data.industry ?? "",
          logoUrl: data.logoUrl ?? "",
        });
      })
      .catch(err => {
        console.error("❌ Fetch error:", err);
        toast.error("❌ Failed to load profile.");
      });
  }, [businessId]);

  const validateField = (name, value) => {
    const field = fields.find(f => f[1] === name);
    if (!field) return null;
    const validation = field[3];

    if (validation.required && !String(value || "").trim()) {
      return `${field[0]} is required.`;
    }
    if (validation.minLength && value.length < validation.minLength) {
      return `${field[0]} must be at least ${validation.minLength} characters.`;
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return `${field[0]} cannot exceed ${validation.maxLength} characters.`;
    }
    if (
      validation.pattern &&
      String(value || "").length > 0 &&
      !validation.pattern.test(value)
    ) {
      return validation.title || `${field[0]} is invalid.`;
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    fields.forEach(([_, name]) => {
      const error = validateField(name, form[name]);
      if (error) newErrors[name] = error;
    });
    return newErrors;
  };

  const handleChange = e => {
    const { name, value } = e.target;

    // Only digits for phone fields
    if (
      (name === "phone" || name === "companyPhone") &&
      value &&
      !/^\d*$/.test(value)
    ) {
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = e => {
    e.preventDefault();

    const formErrors = validateForm();
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    setLoading(true);

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [
        k,
        typeof v === "string" ? v.trim() : v,
      ])
    );

    fetch(`${API_BASE}/businesses/profile-completion/${businessId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(res => (res.ok ? res.json() : Promise.reject("Update failed")))
      .then(() => {
        toast.success("✅ Profile updated successfully!");
        setTimeout(() => navigate("/app/crm"), 800);
      })
      .catch(err => {
        console.error("❌ Submit error:", err);
        toast.error("❌ Failed to update profile.");
      })
      .finally(() => setLoading(false));
  };

  // Calculate completion percentage
  const completionPercentage = Math.round(
    (Object.values(form).filter(v => String(v || "").trim().length > 0).length /
      Object.keys(form).length) *
      100
  );

  const sections = [
    {
      title: "Business Identity",
      description: "Define your company and primary contact.",
      fields: [
        { name: "companyName", icon: Building2 },
        { name: "representativeName", icon: User },
        { name: "industry", icon: Briefcase },
      ],
    },
    {
      title: "Contact & Location",
      description: "Where can customers and partners find you?",
      fields: [
        { name: "phone", icon: Phone },
        { name: "companyPhone", icon: Phone },
        { name: "country", icon: Globe },
        { name: "address", icon: MapPin },
        { name: "website", icon: LinkIcon },
      ],
    },
    {
      title: "Branding",
      description: "Customize your presence with a logo.",
      fields: [
        { name: "logoUrl", icon: ImageIcon },
      ],
    },
  ];

  const getFormField = (name) => fields.find(f => f[1] === name);

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)] px-4 py-4 md:px-6 md:py-6 font-inter">
      {/* Page header */}
      <div className="max-w-5xl mx-auto mb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                <Building2 size={20} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                Profile & Business Details
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Complete your business profile so messaging, campaigns, and
              analytics can use your latest company information.
            </p>
          </div>
          
          <div className="w-full md:w-56 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Setup Progress</span>
              <span className="text-emerald-600">{completionPercentage}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden">
          <form
            onSubmit={handleSubmit}
            className="p-5 md:p-7"
            noValidate
          >
            <div className="space-y-8">
              {sections.map((section, sIdx) => (
                <div key={sIdx} className="relative">
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      {section.title}
                      <div className="h-px flex-1 bg-slate-100 ml-2" />
                    </h2>
                    <p className="text-xs text-slate-500">
                      {section.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                    {section.fields.map(({ name, icon: Icon }) => {
                      const f = getFormField(name);
                      if (!f) return null;
                      const [label, , type] = f;
                      
                      return (
                        <div key={name} className="relative group">
                          <label
                            htmlFor={name}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5 transition-colors group-focus-within:text-emerald-600"
                          >
                            {label}
                          </label>
                          
                          <div className="relative flex items-center">
                            <div className="absolute left-3 text-slate-400 pointer-events-none transition-colors group-focus-within:text-emerald-500">
                              <Icon size={14} />
                            </div>
                            
                            <input
                              id={name}
                              type={type}
                              name={name}
                              value={form[name]}
                              onChange={handleChange}
                              placeholder={`Enter ${label.toLowerCase()}`}
                              className={`w-full pl-9 pr-4 py-1.5 rounded-lg text-sm border bg-white shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 ${
                                errors[name] ? "border-red-400 bg-red-50/10" : "border-slate-200"
                              }`}
                              aria-invalid={errors[name] ? "true" : "false"}
                              aria-describedby={`${name}-error`}
                            />

                            {name === "logoUrl" && form.logoUrl && (
                              <div className="absolute right-2 p-1 bg-white border rounded-lg shadow-sm">
                                <img 
                                  src={form.logoUrl} 
                                  alt="Preview" 
                                  className="w-6 h-6 object-contain rounded"
                                  onError={(e) => { e.target.src = "https://placehold.co/100x100?text=Logo"; }}
                                />
                              </div>
                            )}
                          </div>

                          {errors[name] && (
                            <p
                              className="text-red-500 text-[11px] font-medium mt-1.5 flex items-center gap-1"
                              id={`${name}-error`}
                              role="alert"
                            >
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              {errors[name]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700">Recommended setup step</p>
                  <p className="text-[9px] text-slate-400">Updates sync across your entire business workspace.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <p className="text-[10px] text-slate-400 text-center md:text-right italic leading-tight">
                  Changes take effect immediately <br />
                  upon successful save.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className={`relative overflow-hidden group w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md shadow-emerald-500/10 transition-all ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Save Changes
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";

// const API_BASE = process.env.REACT_APP_API_BASE_URL;

// export default function ProfileCompletion() {
//   const navigate = useNavigate();
//   const businessId = localStorage.getItem("businessId");

//   const [form, setForm] = useState({
//     companyName: "", // ✅ NEW
//     representativeName: "",
//     phone: "",
//     companyPhone: "",
//     country: "",
//     website: "",
//     address: "",
//     industry: "",
//     logoUrl: "",
//   });

//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);

//   // Validation rules (added Company Name)
//   const fields = [
//     [
//       "Company Name",
//       "companyName",
//       "text",
//       { required: true, minLength: 2, maxLength: 150 },
//     ], // ✅ NEW
//     [
//       "Representative Name",
//       "representativeName",
//       "text",
//       { required: true, minLength: 2, maxLength: 100 },
//     ],
//     [
//       "Phone",
//       "phone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid phone number (up to 10 digits)",
//       },
//     ],
//     [
//       "Company Phone",
//       "companyPhone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid company phone number (up to 10 digits)",
//       },
//     ],
//     ["Country", "country", "text", { required: false, maxLength: 100 }],
//     [
//       "Website",
//       "website",
//       "text",
//       {
//         required: false,
//         pattern: /^www\..*/,
//         title: "Website should start with www.",
//       },
//     ],
//     ["Address", "address", "text", { required: false, maxLength: 250 }],
//     ["Industry", "industry", "text", { required: false, maxLength: 100 }],
//     [
//       "Logo URL",
//       "logoUrl",
//       "text",
//       {
//         required: false,
//         pattern: /^(https?:\/\/)?([\w-]+\.)+[\w-]+.*$/,
//         title: "Enter a valid URL",
//       },
//     ],
//   ];

//   useEffect(() => {
//     if (!businessId) return;

//     fetch(`${API_BASE}/businesses/${businessId}`)
//       .then(res =>
//         res.ok ? res.json() : Promise.reject("Failed to fetch profile")
//       )
//       .then(data => {
//         // Prefill. Use CompanyName or BusinessName if present.
//         setForm({
//           companyName: data.companyName ?? data.businessName ?? "", // ✅ NEW
//           representativeName: data.representativeName ?? "",
//           phone: data.phone ?? "",
//           companyPhone: data.companyPhone ?? "",
//           country: data.country ?? "",
//           website: data.website ?? "",
//           address: data.address ?? "",
//           industry: data.industry ?? "",
//           logoUrl: data.logoUrl ?? "",
//         });
//       })
//       .catch(err => {
//         console.error("❌ Fetch error:", err);
//         toast.error("❌ Failed to load profile.");
//       });
//   }, [API_BASE, businessId]);

//   const validateField = (name, value) => {
//     const field = fields.find(f => f[1] === name);
//     if (!field) return null;
//     const validation = field[3];

//     if (validation.required && !String(value || "").trim()) {
//       return `${field[0]} is required.`;
//     }
//     if (validation.minLength && value.length < validation.minLength) {
//       return `${field[0]} must be at least ${validation.minLength} characters.`;
//     }
//     if (validation.maxLength && value.length > validation.maxLength) {
//       return `${field[0]} cannot exceed ${validation.maxLength} characters.`;
//     }
//     if (
//       validation.pattern &&
//       String(value || "").length > 0 &&
//       !validation.pattern.test(value)
//     ) {
//       return validation.title || `${field[0]} is invalid.`;
//     }
//     return null;
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     fields.forEach(([_, name]) => {
//       const error = validateField(name, form[name]);
//       if (error) newErrors[name] = error;
//     });
//     return newErrors;
//   };

//   const handleChange = e => {
//     const { name, value } = e.target;

//     // Only digits for phone fields
//     if (
//       (name === "phone" || name === "companyPhone") &&
//       value &&
//       !/^\d*$/.test(value)
//     ) {
//       return;
//     }

//     setForm(prev => ({ ...prev, [name]: value }));
//     setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
//   };

//   const handleSubmit = e => {
//     e.preventDefault();

//     const formErrors = validateForm();
//     setErrors(formErrors);
//     if (Object.keys(formErrors).length > 0) {
//       toast.error("Please fix validation errors before submitting.");
//       return;
//     }

//     setLoading(true);

//     // Trim strings before sending
//     const payload = Object.fromEntries(
//       Object.entries(form).map(([k, v]) => [
//         k,
//         typeof v === "string" ? v.trim() : v,
//       ])
//     );

//     fetch(`${API_BASE}/businesses/profile-completion/${businessId}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     })
//       .then(res => (res.ok ? res.json() : Promise.reject("Update failed")))
//       .then(() => {
//         toast.success("✅ Profile updated successfully!");
//         setTimeout(() => navigate("/app/crm"), 800);
//       })
//       .catch(err => {
//         console.error("❌ Submit error:", err);
//         toast.error("❌ Failed to update profile.");
//       })
//       .finally(() => setLoading(false));
//   };

//   return (
//     <div className="min-h-screen flex items-start justify-center bg-gray-50 px-0 pt-2">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white shadow-sm border rounded-md w-full max-w-4xl p-4 md:p-6 hover:shadow-md transition"
//         noValidate
//       >
//         <h2 className="text-lg font-bold text-purple-700 mb-6">
//           📝 Complete Your Business Profile
//         </h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//           {fields.map(([label, name, type]) => (
//             <div key={name}>
//               <label
//                 htmlFor={name}
//                 className="text-xs font-medium text-gray-600 block mb-1"
//               >
//                 {label}
//               </label>
//               <input
//                 id={name}
//                 type={type}
//                 name={name}
//                 value={form[name]}
//                 onChange={handleChange}
//                 placeholder={`Enter ${label.toLowerCase()}`}
//                 className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
//                   errors[name] ? "border-red-500" : "border-gray-300"
//                 }`}
//                 aria-invalid={errors[name] ? "true" : "false"}
//                 aria-describedby={`${name}-error`}
//               />
//               {errors[name] && (
//                 <p
//                   className="text-red-600 text-xs mt-1"
//                   id={`${name}-error`}
//                   role="alert"
//                 >
//                   {errors[name]}
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>

//         <div className="pt-6 border-t mt-6 flex justify-end">
//           <button
//             type="submit"
//             disabled={loading}
//             className={`inline-flex items-center px-5 py-2 rounded-md text-white text-sm font-medium transition ${
//               loading
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-purple-600 hover:bg-purple-700"
//             }`}
//           >
//             {loading ? "🔄 Submitting..." : "✅ Submit Profile"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import { toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";

// const API_BASE = process.env.REACT_APP_API_BASE_URL;

// export default function ProfileCompletion() {
//   const navigate = useNavigate();
//   const businessId = localStorage.getItem("businessId");

//   const [form, setForm] = useState({
//     representativeName: "",
//     phone: "",
//     companyPhone: "",
//     country: "",
//     website: "",
//     address: "",
//     industry: "",
//     logoUrl: "",
//   });

//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);

//   // Validation rules from your fields array
//   const fields = [
//     [
//       "Representative Name",
//       "representativeName",
//       "text",
//       { required: true, minLength: 2, maxLength: 100 },
//     ],
//     [
//       "Phone",
//       "phone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid phone number (up to 10 digits)",
//       },
//     ],
//     [
//       "Company Phone",
//       "companyPhone",
//       "text",
//       {
//         required: true,
//         pattern: /^\d{1,10}$/,
//         title: "Enter a valid company phone number (up to 10 digits)",
//       },
//     ],
//     ["Country", "country", "text", { required: false, maxLength: 100 }],
//     [
//       "Website",
//       "website",
//       "text",
//       {
//         required: false,
//         pattern: /^www\..*/,
//         title: "Website should start with www.",
//       },
//     ],
//     ["Address", "address", "text", { required: false, maxLength: 250 }],
//     ["Industry", "industry", "text", { required: false, maxLength: 100 }],
//     [
//       "Logo URL",
//       "logoUrl",
//       "text",
//       {
//         required: false,
//         pattern: /^(https?:\/\/)?([\w-]+\.)+[\w-]+.*$/,
//         title: "Enter a valid URL",
//       },
//     ],
//   ];

//   useEffect(() => {
//     if (!businessId) return;

//     fetch(`${API_BASE}/businesses/${businessId}`)
//       .then(res =>
//         res.ok ? res.json() : Promise.reject("Failed to fetch profile")
//       )
//       .then(data => {
//         console.log("✅ Profile fetched:", data);
//         setForm({
//           representativeName: data.representativeName ?? "",
//           phone: data.phone ?? "",
//           companyPhone: data.companyPhone ?? "",
//           country: data.country ?? "",
//           website: data.website ?? "",
//           address: data.address ?? "",
//           industry: data.industry ?? "",
//           logoUrl: data.logoUrl ?? "",
//         });
//       })
//       .catch(err => {
//         console.error("❌ Fetch error:", err);
//         toast.error("❌ Failed to load profile.");
//       });
//   }, [businessId]);

//   // Validate single field
//   const validateField = (name, value) => {
//     const field = fields.find(f => f[1] === name);
//     if (!field) return null;

//     const validation = field[3];

//     if (validation.required && !value.trim()) {
//       return `${field[0]} is required.`;
//     }

//     if (validation.minLength && value.length < validation.minLength) {
//       return `${field[0]} must be at least ${validation.minLength} characters.`;
//     }

//     if (validation.maxLength && value.length > validation.maxLength) {
//       return `${field[0]} cannot exceed ${validation.maxLength} characters.`;
//     }

//     if (validation.pattern && !validation.pattern.test(value)) {
//       return validation.title || `${field[0]} is invalid.`;
//     }

//     return null;
//   };

//   // Validate all fields, returns errors object
//   const validateForm = () => {
//     const newErrors = {};
//     fields.forEach(([label, name]) => {
//       const error = validateField(name, form[name]);
//       if (error) newErrors[name] = error;
//     });
//     return newErrors;
//   };

//   const handleChange = e => {
//     const { name, value } = e.target;

//     // For phone inputs, allow only digits:
//     if (name === "phone" || name === "companyPhone") {
//       if (value && !/^\d*$/.test(value)) return; // ignore non-digit input
//     }

//     setForm(prev => ({ ...prev, [name]: value }));

//     // Validate on change
//     const error = validateField(name, value);
//     setErrors(prev => ({ ...prev, [name]: error }));
//   };

//   const handleSubmit = e => {
//     e.preventDefault();

//     const formErrors = validateForm();
//     setErrors(formErrors);

//     if (Object.keys(formErrors).length > 0) {
//       toast.error("Please fix validation errors before submitting.");
//       return;
//     }

//     setLoading(true);

//     fetch(`${API_BASE}/businesses/profile-completion/${businessId}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(form),
//     })
//       .then(res => (res.ok ? res.json() : Promise.reject("Update failed")))
//       .then(() => {
//         toast.success("✅ Profile updated successfully!");
//         setTimeout(() => navigate("/app/crm"), 1000);
//       })
//       .catch(err => {
//         console.error("❌ Submit error:", err);
//         toast.error("❌ Failed to update profile.");
//       })
//       .finally(() => setLoading(false));
//   };

//   return (
//     <div className="min-h-screen flex items-start justify-center bg-gray-50 px-0 pt-2">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white shadow-sm border rounded-md w-full max-w-4xl p-4 md:p-6 hover:shadow-md transition"
//         noValidate
//       >
//         <h2 className="text-lg font-bold text-purple-700 mb-6">
//           📝 Complete Your Business Profile
//         </h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
//           {fields.map(([label, name, type]) => (
//             <div key={name}>
//               <label
//                 htmlFor={name}
//                 className="text-xs font-medium text-gray-600 block mb-1"
//               >
//                 {label}
//               </label>
//               <input
//                 id={name}
//                 type={type}
//                 name={name}
//                 value={form[name]}
//                 onChange={handleChange}
//                 placeholder={`Enter ${label.toLowerCase()}`}
//                 className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
//                   errors[name] ? "border-red-500" : "border-gray-300"
//                 }`}
//                 aria-invalid={errors[name] ? "true" : "false"}
//                 aria-describedby={`${name}-error`}
//               />
//               {errors[name] && (
//                 <p
//                   className="text-red-600 text-xs mt-1"
//                   id={`${name}-error`}
//                   role="alert"
//                 >
//                   {errors[name]}
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>

//         <div className="pt-6 border-t mt-6 flex justify-end">
//           <button
//             type="submit"
//             disabled={loading}
//             className={`inline-flex items-center px-5 py-2 rounded-md text-white text-sm font-medium transition ${
//               loading
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-purple-600 hover:bg-purple-700"
//             }`}
//           >
//             {loading ? "🔄 Submitting..." : "✅ Submit Profile"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }
