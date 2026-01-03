import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import { toast } from "react-toastify";

import axiosClient from "../../../api/axiosClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = value => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.length === 10 ? digits : "";
};

const normalizeHeader = header =>
  String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getRowValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return "";
};

export default function CsvUploadModal({
  isOpen,
  onClose,
  onRefresh,
  onImportingChange,
}) {
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rowReports, setRowReports] = useState([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const errorRows = useMemo(
    () => rowReports.filter(row => row.errors.length > 0),
    [rowReports]
  );
  const duplicateRows = useMemo(
    () => rowReports.filter(row => row.isDuplicate),
    [rowReports]
  );
  const existingRows = useMemo(
    () => rowReports.filter(row => row.existsInCrm),
    [rowReports]
  );

  const importableRows = useMemo(() => {
    return rowReports.filter(row => {
      if (row.errors.length > 0) return false;
      if (skipDuplicates && row.isDuplicate) return false;
      if (skipExisting && row.existsInCrm) return false;
      return true;
    });
  }, [rowReports, skipDuplicates, skipExisting]);

  const totalRows = rowReports.length;
  const validRows = totalRows - errorRows.length;
  const skippedRows = Math.max(0, totalRows - importableRows.length);

  const blockingReasons = useMemo(() => {
    const reasons = [];
    if (!hasValidated) return reasons;
    if (errorRows.length > 0 && !skipInvalid) {
      reasons.push("Validation errors found. Enable “Skip invalid rows”.");
    }
    if (duplicateRows.length > 0 && !skipDuplicates) {
      reasons.push("Duplicate phones found. Enable “Skip duplicates”.");
    }
    if (existingRows.length > 0 && !skipExisting) {
      reasons.push("Existing contacts found. Enable “Skip existing contacts”.");
    }
    if (importableRows.length === 0) {
      reasons.push("No importable rows after applying filters.");
    }
    return reasons;
  }, [
    hasValidated,
    errorRows.length,
    duplicateRows.length,
    existingRows.length,
    skipInvalid,
    skipDuplicates,
    skipExisting,
    importableRows.length,
  ]);

  const canImport =
    hasValidated &&
    blockingReasons.length === 0 &&
    !validating &&
    !checkingExisting &&
    !uploading;

  const resetState = () => {
    setFile(null);
    setValidating(false);
    setCheckingExisting(false);
    setUploading(false);
    setRowReports([]);
    setHasValidated(false);
    setSkipInvalid(true);
    setSkipDuplicates(true);
    setSkipExisting(true);
    setConfirmOpen(false);
    onImportingChange?.(false);
  };

  const handleClose = () => {
    if (uploading) return;
    resetState();
    onClose?.();
  };

  const handleFileChange = e => {
    setFile(e.target.files?.[0] || null);
    setRowReports([]);
    setHasValidated(false);
    setSkipInvalid(true);
    setSkipDuplicates(true);
    setSkipExisting(true);
    setConfirmOpen(false);
  };

  const checkExistingContacts = async reports => {
    const phones = Array.from(
      new Set(reports.map(row => row.normalizedPhone).filter(Boolean))
    );
    if (phones.length === 0) return;

    const existing = new Set();
    setCheckingExisting(true);

    for (const phone of phones) {
      try {
        const res = await axiosClient.get("/contacts/", {
          params: {
            tab: "all",
            search: phone,
            page: 1,
            pageSize: 10,
          },
        });
        const result = res.data?.data ?? res.data;
        const items = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result?.Items)
          ? result.Items
          : Array.isArray(result)
          ? result
          : [];
        const match = items.some(contact => {
          const normalized = normalizePhone(contact.phoneNumber);
          const isActive =
            contact.isActive !== undefined
              ? contact.isActive
              : contact.IsActive !== undefined
              ? contact.IsActive
              : true;
          return normalized && normalized === phone && isActive !== false;
        });
        if (match) existing.add(phone);
      } catch (err) {
        console.error("Failed to check existing contacts", err);
      }
    }

    setRowReports(prev =>
      prev.map(row => ({
        ...row,
        existsInCrm: existing.has(row.normalizedPhone),
      }))
    );
    setCheckingExisting(false);
  };

  const handleValidate = () => {
    if (!file) {
      toast.warn("Please select a CSV file.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.warn("Please upload a .csv file.");
      return;
    }

    setValidating(true);
    setHasValidated(false);
    setRowReports([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: results => {
        const rows = Array.isArray(results.data) ? results.data : [];
        const reports = [];

        rows.forEach((row, index) => {
          const name = getRowValue(row, ["name"]);
          const phoneRaw = getRowValue(row, [
            "phonenumber",
            "phone",
            "mobile",
            "mobilenumber",
          ]);
          const email = getRowValue(row, ["email"]);
          const leadSource = getRowValue(row, ["leadsource", "source"]);
          const notes = getRowValue(row, ["notes", "note"]);

          const hasAnyValue = [name, phoneRaw, email, leadSource, notes].some(
            value => String(value ?? "").trim()
          );
          if (!hasAnyValue) return;

          const errors = [];
          if (!String(name ?? "").trim()) {
            errors.push("Name is required.");
          }

          const normalizedPhone = normalizePhone(phoneRaw);
          if (!String(phoneRaw ?? "").trim()) {
            errors.push("Phone number is required.");
          } else if (!normalizedPhone) {
            errors.push(
              "Phone number must be 10 digits after removing +91 or leading 0."
            );
          }

          const emailValue = String(email ?? "").trim();
          if (emailValue && !emailRegex.test(emailValue)) {
            errors.push("Email format is invalid.");
          }

          reports.push({
            rowNumber: index + 2,
            name: String(name ?? "").trim(),
            phoneRaw: String(phoneRaw ?? "").trim(),
            normalizedPhone,
            email: emailValue,
            leadSource: String(leadSource ?? "").trim(),
            notes: String(notes ?? "").trim(),
            errors,
            isDuplicate: false,
            existsInCrm: false,
          });
        });

        const seenPhones = new Set();
        reports.forEach(report => {
          if (!report.normalizedPhone) return;
          if (seenPhones.has(report.normalizedPhone)) {
            report.isDuplicate = true;
          } else {
            seenPhones.add(report.normalizedPhone);
          }
        });

        setRowReports(reports);
        setHasValidated(true);
        setValidating(false);

        if (reports.length === 0) {
          toast.warn("No valid data rows found in the CSV.");
          return;
        }

        checkExistingContacts(reports);
      },
      error: () => {
        toast.error("Failed to read the CSV file.");
        setValidating(false);
      },
    });
  };

  const handleOpenConfirm = () => {
    if (!canImport) return;
    setConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    if (!file || importableRows.length === 0) return;
    setUploading(true);
    onImportingChange?.(true);

    const exportRows = importableRows.map(row => ({
      Name: row.name,
      PhoneNumber: row.normalizedPhone,
      Email: row.email,
      LeadSource: row.leadSource,
      Notes: row.notes,
    }));
    const csv = Papa.unparse(exportRows, {
      columns: ["Name", "PhoneNumber", "Email", "LeadSource", "Notes"],
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const formData = new FormData();
    formData.append("file", blob, file.name);

    try {
      await axiosClient.post("/contacts/bulk-import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Contacts imported successfully.");
      onRefresh?.();
      resetState();
      onClose?.();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to import contacts. Please check the CSV.";
      toast.error(message);
    } finally {
      setUploading(false);
      onImportingChange?.(false);
      setConfirmOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4 relative">
        <h2 className="text-xl font-bold text-emerald-700">
          Import Contacts CSV
        </h2>

        <input type="file" accept=".csv" onChange={handleFileChange} />

        {hasValidated && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-800">
              Validation summary
            </div>
            <div>Total rows: {totalRows}</div>
            <div>Valid rows: {validRows}</div>
            <div>Invalid rows: {errorRows.length}</div>
            <div>Duplicates in file: {duplicateRows.length}</div>
            <div>Existing in CRM: {existingRows.length}</div>
            <div>Ready to import: {importableRows.length}</div>
            {checkingExisting && (
              <div className="text-[11px] text-slate-500">
                Checking existing contacts...
              </div>
            )}
          </div>
        )}

        {hasValidated && (
          <div className="space-y-2 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={e => setSkipInvalid(e.target.checked)}
              />
              Skip rows with validation errors
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={e => setSkipDuplicates(e.target.checked)}
              />
              Skip duplicate phone numbers in file
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={e => setSkipExisting(e.target.checked)}
              />
              Skip contacts that already exist in CRM
            </label>
          </div>
        )}

        {errorRows.length > 0 && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 max-h-40 overflow-auto">
            <div className="font-semibold text-rose-800 mb-1">Row issues</div>
            <ul className="space-y-1">
              {errorRows.map((row, index) => (
                <li key={`${row.rowNumber}-err-${index}`}>
                  <span className="font-semibold">
                    Row {row.rowNumber}:
                  </span>{" "}
                  {row.errors.join(" ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {duplicateRows.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 max-h-32 overflow-auto">
            <div className="font-semibold text-amber-800 mb-1">
              Duplicate rows
            </div>
            <ul className="space-y-1">
              {duplicateRows.map((row, index) => (
                <li key={`${row.rowNumber}-dup-${index}`}>
                  Row {row.rowNumber}: {row.phoneRaw || row.normalizedPhone}
                </li>
              ))}
            </ul>
          </div>
        )}

        {existingRows.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 max-h-32 overflow-auto">
            <div className="font-semibold text-amber-800 mb-1">
              Already in CRM
            </div>
            <ul className="space-y-1">
              {existingRows.map((row, index) => (
                <li key={`${row.rowNumber}-exist-${index}`}>
                  Row {row.rowNumber}: {row.phoneRaw || row.normalizedPhone}
                </li>
              ))}
            </ul>
          </div>
        )}

        {blockingReasons.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            {blockingReasons.map((reason, index) => (
              <div key={`${reason}-${index}`}>{reason}</div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleValidate}
            disabled={!file || validating || uploading}
            className="px-4 py-2 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm disabled:opacity-60"
          >
            {validating ? "Validating..." : "Validate"}
          </button>
          <button
            onClick={handleOpenConfirm}
            disabled={!canImport}
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:bg-emerald-300"
          >
            Import
          </button>
        </div>

        {confirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-5 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Confirm import
              </h3>
              <p className="text-sm text-slate-600">
                {importableRows.length} contacts will be imported. Continue?
              </p>
              {skippedRows > 0 && (
                <p className="text-xs text-slate-500">
                  Skipping {skippedRows} row{skippedRows === 1 ? "" : "s"} due
                  to filters.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={uploading}
                  className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:bg-emerald-300"
                >
                  {uploading ? "Importing..." : "Confirm Import"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
