import { AlertTriangle } from "lucide-react";

export default function FinancialDisclaimer() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
      <div className="flex items-start space-x-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <p className="text-yellow-800 text-xs font-medium">
          <strong>This is not financial advice.</strong> For personalized guidance, consult a licensed advisor.
        </p>
      </div>
    </div>
  );
}