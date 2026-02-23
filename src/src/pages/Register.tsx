import React, { useState } from "react";
import { saveMember } from "../services/memberService";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    rank: "",
    responsibility: "",
    phone: "",
    photo: "",
    leftFlag: "",
    centerLogo: "",
    rightFlag: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await fetch("/api/members", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(formData),
});

  return (
    <div style={{ padding: 20 }}>
      <h2>Register Member</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
        />
        <br /><br />

        <input
          name="rank"
          placeholder="Rank"
          value={formData.rank}
          onChange={handleChange}
        />
        <br /><br />

        <input
          name="responsibility"
          placeholder="Responsibility"
          value={formData.responsibility}
          onChange={handleChange}
        />
        <br /><br />

        <input
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
        />
        <br /><br />

        <button type="submit">Generate ID Card</button>
      </form>
    </div>
  );
};

export default Register;