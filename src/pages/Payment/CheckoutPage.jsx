// 📄 src/pages/Payment/CheckoutPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import {
  CreditCard,
  Check,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Zap,
  Gift,
  ChevronDown,
} from "lucide-react";

// --- STATIC PLAN DATA (Source of Truth) ---
const STATIC_PLAN_DATA = {
  "Free Forever": {
    priceMonthly: 0,
    priceYearly: 0,
    currency: "INR",
    description: "Get Started with WhatsApp Ads & WhatsApp API",
  },
  Starter: {
    priceMonthly: 1350,
    priceYearly: 14580, // 1350 * 12 * 0.9
    currency: "INR",
    description: "Everything you need to get started with your business.",
  },
  Pro: {
    priceMonthly: 2880,
    priceYearly: 31104, // 2880 * 12 * 0.9
    currency: "INR",
    description:
      "Highly recommended plan to make the best use of Retargeting Campaigns",
  },
  Enterprise: {
    priceMonthly: "Custom",
    priceYearly: "Custom",
    currency: "INR",
    description: "Recommended for 5 Lac+ Messages per month",
  },
};

const formatAmount = (amount, currency) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Retrieve state passed from BillingPage
  const { planKey, billingCycle: initialCycle } = location.state || {};

  // Local state for the cycle (allows changing it on this page)
  const [selectedCycle, setSelectedCycle] = useState(initialCycle || "Monthly");

  // Redirect back if no plan selected
  useEffect(() => {
    if (!planKey) {
      toast.warn("Please select a plan first.");
      navigate("/app/billing");
    }
  }, [planKey, navigate]);

  // Derived Values
  const selectedPlanData = STATIC_PLAN_DATA[planKey];
  const currency = selectedPlanData?.currency || "INR";

  // Calculate Base Price based on CURRENT selected cycle
  const basePrice = useMemo(() => {
    if (!selectedPlanData) return 0;
    return selectedCycle === "Monthly"
      ? selectedPlanData.priceMonthly
      : selectedPlanData.priceYearly;
  }, [selectedPlanData, selectedCycle]);

  // Calculate Savings (Visual only)
  const savingsAmount = useMemo(() => {
    if (!selectedPlanData || selectedCycle === "Monthly") return 0;
    // Theoretical full price vs actual yearly price
    const monthlyPrice = selectedPlanData.priceMonthly;
    if (typeof monthlyPrice !== "number") return 0;
    const fullYearPrice = monthlyPrice * 12;
    return fullYearPrice - selectedPlanData.priceYearly;
  }, [selectedPlanData, selectedCycle]);

  // Calculate Final Totals
  const pricePreview = useMemo(() => {
    let subtotal = basePrice || 0;
    let discount = 0;

    if (appliedCoupon?.valid) {
      if (appliedCoupon.discountType === "Flat") {
        discount = appliedCoupon.discountValue;
      } else if (appliedCoupon.discountType === "Percent") {
        discount = (subtotal * appliedCoupon.discountValue) / 100;
      }
    }

    if (discount > subtotal) discount = subtotal;
    const taxable = subtotal - discount;
    const gst = Math.round(taxable * 0.18 * 100) / 100;
    const total = Math.max(taxable + gst, 0);

    return { subtotal, discount, gst, total };
  }, [basePrice, appliedCoupon]);

  // Handlers
  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return toast.warn("Enter a code.");

    try {
      setCouponLoading(true);
      // Validate against the CURRENT selected cycle
      const res = await axiosClient.get("/payment/coupon/validate", {
        params: { code, planId: planKey, billingCycle: selectedCycle },
      });
      if (!res.data.ok || !res.data.valid) {
        setAppliedCoupon(null);
        toast.error(res.data.message || "Invalid coupon.");
        return;
      }
      setAppliedCoupon(res.data);
      toast.success("Coupon applied!");
    } catch (err) {
      setAppliedCoupon(null);
      toast.error("Validation failed.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleProceedToPay = async () => {
    try {
      setLoading(true);
      const payload = {
        planId: planKey,
        billingCycle: selectedCycle, // Send the updated cycle
        couponCode: appliedCoupon?.valid ? appliedCoupon.code : undefined,
      };

      const res = await axiosClient.post(
        "/payment/subscribe/checkout",
        payload
      );

      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        toast.error("No redirect URL received.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate checkout.");
    } finally {
      setLoading(false);
    }
  };

  if (!planKey) return null;

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* 1. Header */}
      <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Plans
        </button>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Lock size={14} className="text-emerald-600" />
          <span className="font-semibold text-slate-700">Secure Checkout</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Order Context (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Plan Header Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-md border border-slate-200 text-emerald-600">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Subscription Details
                </h2>
                <p className="text-xs text-slate-500">
                  You are upgrading to a premium experience
                </p>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900">
                {planKey} Plan
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {selectedPlanData?.description}
              </p>
            </div>
          </div>

          {/* Billing Period Selector (New Section) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-slate-800">
                Billing Period
              </label>
              {selectedCycle === "Yearly" && savingsAmount > 0 && (
                <span className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full">
                  SAVE {formatAmount(savingsAmount, currency)}
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={selectedCycle}
                onChange={e => {
                  setSelectedCycle(e.target.value);
                  setAppliedCoupon(null); // Reset coupon on cycle change to re-validate
                }}
                className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-emerald-500 font-medium cursor-pointer"
              >
                <option value="Monthly">1 Month (Monthly Billing)</option>
                <option value="Yearly">
                  12 Months (Yearly Billing - Save 10%)
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 flex justify-between">
              <span>
                {selectedCycle === "Monthly"
                  ? "Renews automatically every month."
                  : "Renews automatically every year."}
              </span>
              <span className="font-medium text-slate-700">
                {selectedCycle === "Monthly"
                  ? `${formatAmount(basePrice, currency)} / month`
                  : `${formatAmount(
                      basePrice / 12,
                      currency
                    )} / month (billed yearly)`}
              </span>
            </div>
          </div>

          {/* Trust Box */}
          <div className="bg-transparent rounded-xl border border-dashed border-slate-300 p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <ShieldCheck size={24} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700">
                  Bank-Level Security
                </div>
                <div className="text-xs text-slate-500">
                  Your payment is encrypted and secured by Razorpay.
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <CreditCard size={24} className="text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700">
                  All Cards Accepted
                </div>
                <div className="text-xs text-slate-500">
                  Credit, Debit, UPI, and Net Banking supported.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 sticky top-8 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                Order Summary
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Coupon Input */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Gift size={12} /> Discount Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="PROMO CODE"
                    disabled={loading}
                    className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase placeholder:text-slate-400"
                  />
                  {appliedCoupon ? (
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput("");
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      REMOVE
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput || couponLoading}
                      className="px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors"
                    >
                      {couponLoading ? "..." : "APPLY"}
                    </button>
                  )}
                </div>
                {appliedCoupon?.valid && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 p-2 rounded border border-emerald-100">
                    <Check size={12} />
                    {appliedCoupon.message || "Code applied successfully"}
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Calculations */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>
                    {planKey} ({selectedCycle})
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatAmount(pricePreview.subtotal, currency)}
                  </span>
                </div>

                {pricePreview.discount > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>
                      - {formatAmount(pricePreview.discount, currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>GST (18%)</span>
                  <span className="font-medium text-slate-900">
                    {formatAmount(pricePreview.gst, currency)}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center border border-emerald-100">
                <div>
                  <div className="text-xs text-emerald-700 font-medium uppercase">
                    Total Payable
                  </div>
                  <div className="text-[10px] text-emerald-600">
                    Including all taxes
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatAmount(pricePreview.total, currency)}
                </div>
              </div>

              <button
                onClick={handleProceedToPay}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-lg shadow-md shadow-emerald-200 transition-all transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    Processing{" "}
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </span>
                ) : (
                  `Pay Securely ${formatAmount(pricePreview.total, currency)}`
                )}
              </button>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">
                By confirming, you agree to our Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
