import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

function ProductForm() {
  const navigate = useNavigate();
  const { productId } = useParams(); // <-- detect edit mode
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "INR",
    imageUrl: "",
  });

  const businessId = "11111111-1111-1111-1111-111111111111"; // TODO: dynamic later

  const isEditMode = Boolean(productId);

  // 🧠 Load product if in edit mode
  useEffect(() => {
    if (isEditMode) {
      axios
        .get(`https://localhost:7113/api/product?businessId=${businessId}`)
        .then(res => {
          const product = res.data.find(p => p.id === productId);
          if (product) {
            setFormData({
              name: product.name,
              description: product.description,
              price: product.price,
              currency: product.currency,
              imageUrl: product.imageUrl,
            });
          } else {
            alert("⚠️ Product not found.");
            navigate("/dashboard/productcatalog");
          }
        })
        .catch(err => {
          console.error("❌ Failed to load product:", err);
        });
    }
  }, [productId, businessId, isEditMode, navigate]); // ✅ fixed dependencies

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      businessId,
      id: productId, // for PUT
    };

    try {
      if (isEditMode) {
        await axios.put(
          `https://localhost:7113/api/product/${productId}`,
          payload
        );
        alert("✅ Product updated!");
      } else {
        await axios.post(`https://localhost:7113/api/product`, payload);
        alert("✅ Product added!");
      }
      navigate("/dashboard/productcatalog");
    } catch (err) {
      alert("❌ Failed to save product.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow mt-10">
        <h2 className="text-2xl font-bold text-purple-600 mb-4">
          {isEditMode ? "✏️ Edit Product" : "➕ Add New Product"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ["Product Name", "name"],
            ["Description", "description"],
            ["Price", "price"],
            ["Currency", "currency"],
            ["Image URL", "imageUrl"],
          ].map(([label, name]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type={name === "price" ? "number" : "text"}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={`Enter ${label.toLowerCase()}`}
                required
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : isEditMode
              ? "Update Product"
              : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;
