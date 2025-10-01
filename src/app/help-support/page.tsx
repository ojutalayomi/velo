"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
} from "lucide-react";

const HelpSupportPage = () => {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I reset my password?",
      answer:
        "To reset your password, click on the 'Forgot Password' link on the login page. Enter your email address, and we'll send you instructions to reset your password.",
    },
    {
      question: "How can I update my profile information?",
      answer:
        "Go to Settings > Personal Information to update your profile details including name, email, phone number, and other personal information.",
    },
    {
      question: "How do I manage my privacy settings?",
      answer:
        "Navigate to Settings > Privacy & Security to manage your privacy preferences, including who can see your profile and how your information is shared.",
    },
    {
      question: "What should I do if I can't log in?",
      answer:
        "If you're having trouble logging in, try resetting your password. If the issue persists, contact our support team through the contact form below.",
    },
    {
      question: "How do I delete my account?",
      answer:
        "To delete your account, go to Settings > Privacy & Security > Account Management. Please note that this action is irreversible.",
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement ticket submission logic
    // console.log('Support ticket submitted');
  };

  return (
    <div className="max-h-screen overflow-auto bg-gray-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b dark:border-neutral-800">
        <div className="px-4 py-2 flex items-center gap-4">
          <button
            onClick={() => router.push("/general")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-gray-900 dark:text-white" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Help & Support</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mb-16 tablets:mb-0">
        {/* Quick Support Options */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="tel:+1234567890"
            className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <Phone className="w-8 h-8 text-green-500 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Phone Support</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Call us 24/7</p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">+1 (234) 567-890</p>
          </a>

          <a
            href="mailto:support@example.com"
            className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <Mail className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Email Support</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Get email support</p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              support@example.com
            </p>
          </a>

          <a
            href="#live-chat"
            className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center"
          >
            <MessageCircle className="w-8 h-8 text-purple-500 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white">Live Chat</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Chat with us</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Available Now</p>
          </a>
        </section>

        {/* FAQs Section */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-b dark:border-neutral-700 last:border-0 pb-4 last:pb-0"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">{faq.question}</h3>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {expandedFaq === index && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Support Ticket Form */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Submit a Support Ticket
          </h2>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white"
                placeholder="What do you need help with?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white"
                placeholder="Please describe your issue in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm transition-colors duration-200"
            >
              Submit Ticket
            </button>
          </form>
        </section>

        {/* Additional Resources */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Additional Resources
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="#documentation"
              className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors"
            >
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Documentation</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Read our detailed guides</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>

            <a
              href="#community"
              className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-purple-500" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Community Forum</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Join the discussion</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HelpSupportPage;
