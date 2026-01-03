import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Trash2, Info } from "lucide-react";
import { Card } from "../../components/ui/card";

// NOTE: Minimal scaffold. We only know DELETE /templates/{name}?language=
// In Step 29, once we confirm a list endpoint (e.g., GET /api/whatsapp-templates),
// we’ll replace the “empty state” with a real grid, using axiosClient.

export default function ApprovedTemplatesPage() {
  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <Link
        to="/app/template-builder/library"
        className="text-purple-600 hover:underline flex items-center gap-2 mb-4"
      >
        <ChevronLeft size={18} /> Back to Library
      </Link>

      <h2 className="text-2xl font-bold text-purple-800 mb-2">
        Approved Templates
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        View your approved templates here and delete them from Meta if needed.
      </p>

      <Card className="p-6 flex items-start gap-3">
        <Info className="text-indigo-500 mt-0.5" size={18} />
        <div className="text-sm text-gray-700">
          We’ll load the approved list after API confirmation in Step 29. The
          delete action will call:
          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded border">
            DELETE
            /api/template-builder/templates/&lt;name&gt;?language=&lt;en_US&gt;
          </pre>
        </div>
      </Card>
    </div>
  );
}
