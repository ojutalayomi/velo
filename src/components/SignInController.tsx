// 'use client'
interface FormData{
  UsernameOrEmail: string,
  password: string,
}

interface SignInComponentProps {
  formData: FormData;
}

export default async function SignInComponent({formData}: SignInComponentProps) {
  const response = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
  });
  if (!response.ok) {
      const errorText = await response.text();
      // Try to parse the response to see if it contains a custom error message
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || 'Network response was not ok');
  };
  return response.json();
};

