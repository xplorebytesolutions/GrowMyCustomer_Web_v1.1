import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  const businessId =
    localStorage.getItem("businessId") ||
    "11111111-1111-1111-1111-111111111111";
  const businessNumber =
    localStorage.getItem("whatsappNumber") || "917082156227";

  // 🔄 Fetch products
  useEffect(() => {
    axiosClient
      .get(`/product?businessId=${businessId}`)
      .then(res => setProducts(res.data))
      .catch(() => toast.error("❌ Error fetching products"));
  }, [businessId]);

  // 📤 Share on WhatsApp
  const shareOnWhatsApp = async product => {
    const trackingPayload = {
      businessId,
      productId: product.id,
      userId: "customer-001", // dynamic later
      userName: "Amit Sharma",
      userPhone: "9876543210",
      botId: "bot-01",
      categoryBrowsed: "Ads",
      productBrowsed: product.name,
      ctaJourney: "BuyNow",
      refMessageId: "",
    };

    try {
      await axiosClient.post("/catalog-tracking/log-click", trackingPayload);
      console.log("✅ Click tracked successfully.");
    } catch (err) {
      console.error("❌ Failed to track click:", err);
    }

    const message = `🛍️ *${product.name}*\n${product.description}\n💰 Price: ₹${product.price} ${product.currency}`;
    const encoded = encodeURIComponent(message);
    const waLink = `https://wa.me/${businessNumber}?text=${encoded}`;
    window.open(waLink, "_blank");
  };

  // 🗑️ Delete product
  const handleDelete = async productId => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      await axiosClient.delete(`/product/${productId}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success("🗑️ Product deleted successfully!");
    } catch (err) {
      toast.error("❌ Failed to delete product");
    }
  };

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-800">
          🛒 Product Catalog
        </h2>
        <button
          onClick={() => navigate("/app/catalog/form")}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition text-sm"
        >
          ➕ Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">🚫 No products found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow p-4 border border-gray-100 hover:shadow-md transition"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-40 w-full object-cover rounded mb-3"
              />
              <h3 className="text-lg font-semibold text-gray-800">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500">{product.description}</p>
              <p className="text-emerald-700 font-bold mt-2">
                ₹{product.price} {product.currency}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => shareOnWhatsApp(product)}
                  className="w-full bg-green-500 text-white py-2 rounded-xl hover:bg-green-600 text-sm"
                >
                  📤 Share on WhatsApp
                </button>

                <button
                  onClick={() =>
                    navigate(`/app/catalog/form/${product.id}`)
                  }
                  className="w-full bg-slate-700 text-white py-2 rounded-xl hover:bg-slate-800 text-sm"
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={() => handleDelete(product.id)}
                  className="w-full bg-red-500 text-white py-2 rounded-xl hover:bg-red-600 text-sm"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductCatalog;
