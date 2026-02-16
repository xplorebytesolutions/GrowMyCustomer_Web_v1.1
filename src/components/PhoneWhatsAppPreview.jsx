import React from "react";

export default function PhoneWhatsAppPreview({
  businessName = "XploreByte",
  templateBody = "",
  parameters = [],
  imageUrl = "",
  buttonParams = [],
  width = 320,
}) {
  // Replace {{1}}, {{2}}... with parameters
  const renderedBody = (templateBody || "").replace(/{{(\d+)}}/g, (_, i) => {
    const v = parameters[Number(i) - 1] ?? "";
    return v !== "" ? v : `{{${i}}}`;
  });

  return (
    <div className="flex justify-center">
      {/* Mobile Phone Frame */}
      <div
        className="relative bg-gray-900 rounded-[2.5rem] shadow-2xl p-2"
        style={{ width: `${width}px`, height: "600px" }}
      >
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-2xl z-10"></div>

        {/* Screen */}
        <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 pt-2 pb-1 text-black text-sm font-semibold">
            <span>9:41</span>
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
              </div>
              <div className="w-6 h-3 border border-black rounded-sm relative">
                <div className="w-4 h-2 bg-green-500 rounded-sm absolute top-0.5 left-0.5"></div>
              </div>
            </div>
          </div>

          {/* WhatsApp Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54] text-white">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-white">
              {businessName?.charAt(0)?.toUpperCase() || "Y"}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base">XploreByte</div>
              <div className="text-xs text-green-200">online</div>
            </div>
            <div className="flex space-x-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>

          {/* Chat Area */}
          <div
            className="p-4 overflow-y-auto relative bg-[#e5ddd5]"
            style={{
              height: "460px",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1f2eb' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3Cg fill='%23a8dadc' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm-20-18c9.941 0 18 8.059 18 18s-8.059 18-18 18S-8 39.941-8 30s8.059-18 18-18z'/%3E%3C/g%3E%3Cg fill='%23e5ddd5' fill-opacity='0.3'%3E%3Cpath d='M50 50c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10zm-10-8c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
            }}
          >
            {/* Message Bubble */}
            <div className="flex justify-start mb-4">
              <div className="relative max-w-[85%]">
                {/* Message Container */}
                <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm">
                  {/* Header Image */}
                  {imageUrl ? (
                    <div className="mb-3 -m-3 -mt-3">
                      {imageUrl.startsWith("handle:") ? (
                        <div className="w-full h-40 bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 rounded-t-2xl">
                          <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] font-medium uppercase tracking-tight">Media Uploaded (Meta Handle)</span>
                        </div>
                      ) : (
                        <div className="w-full h-40 rounded-t-2xl overflow-hidden">
                          <img
                            src={imageUrl}
                            alt="Header"
                            className="w-full h-40 object-cover"
                            onError={e => {
                              const img = e.currentTarget;
                              img.style.display = "none";
                              const fallback = img.nextElementSibling;
                              if (fallback && fallback instanceof HTMLElement) {
                                fallback.style.display = "flex";
                              }
                            }}
                          />
                          <div
                            className="w-full h-40 bg-slate-100 items-center justify-center gap-2 text-slate-400"
                            style={{ display: "none" }}
                          >
                            <span className="text-[10px] font-medium uppercase tracking-tight">
                              Media Preview Unavailable
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3 -m-3 -mt-3 w-full h-40 bg-slate-50 flex items-center justify-center border-b border-gray-100 rounded-t-2xl">
                      <span className="text-[10px] text-gray-400 italic">No media selected</span>
                    </div>
                  )}

                  {/* Message Text */}
                  <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {renderedBody}
                  </div>

                  {/* Action Buttons */}
                  {Array.isArray(buttonParams) && buttonParams.length > 0 && (
                    <div className="mt-3 -mx-3 -mb-3">
                      {buttonParams.map((button, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-center gap-3 px-4 py-3 text-blue-500 hover:bg-gray-50 cursor-pointer ${
                            index > 0 ? "border-t border-gray-100" : ""
                          }`}
                        >
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {button?.subType === "url" ||
                            button?.type === "url" ? (
                              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            ) : button?.subType === "copy_code" ||
                              button?.type === "copy_code" ? (
                              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            ) : (
                              <path d="M10 17l5-5-5-5v10z" />
                            )}
                          </svg>
                          <span className="text-sm font-medium truncate">
                            {button?.text || "Button"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Time */}
                  <div className="text-right mt-2">
                    <span className="text-xs text-gray-500">9:41 AM</span>
                  </div>
                </div>

                {/* Message Tail */}
                <div className="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
