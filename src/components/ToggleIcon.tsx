"use client";
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import $ from "jquery";
import "./fontAwesomeLibrary";

const ToggleIcon: React.FC<{ inputId: string }> = ({ inputId }) => {
  const [isEye, setIsEye] = useState(true);
  const element = "#" + inputId;

  const toggleIcon = () => {
    setIsEye(!isEye);
    if ($(element).prop("type") === "password") {
      $(element).prop("type", "text");
    } else {
      $(element).prop("type", "password");
    }
  };

  return (
    <FontAwesomeIcon
      onClick={toggleIcon}
      icon={isEye ? "eye-slash" : "eye"}
      className="icon-eye"
      size="lg"
    />
  );
};

export default ToggleIcon;
