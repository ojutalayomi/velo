import { FormData } from "./FormProps";

const SubmitForm = async (formData: FormData) => {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    // Try to parse the response to see if it contains a custom error message
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  } else {
    return response.json();
  }
};

export default SubmitForm;
