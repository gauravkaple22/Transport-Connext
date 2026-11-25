import Image from "next/image";
import QRCode from "qrcode";
import { formatFreight } from "../../../lib/load-offers";

export async function CommissionUpiPayment({ offerId, amount }: { offerId: string; amount: number }) {
  const payee = process.env.PLATFORM_UPI_ID?.trim();
  const name = process.env.PLATFORM_UPI_NAME?.trim() || "Transport Connect";
  if (!payee || !/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(payee) || !Number.isSafeInteger(amount) || amount <= 0) {
    return <p className="text-sm text-[#50645c]">UPI is currently unavailable. If you already paid the platform fee, submit your payment reference below.</p>;
  }

  const params = {
    pa: payee,
    pn: name,
    tr: offerId.replaceAll("-", ""),
    tn: "Transport Connect platform fee",
    am: (amount / 100).toFixed(2),
    cu: "INR",
  };
  const query = Object.entries(params).map(([key, value]) => key + "=" + encodeURIComponent(value)).join("&");
  const uri = "upi://pay?" + query;
  const qr = await QRCode.toDataURL(uri, { width: 256, margin: 4, errorCorrectionLevel: "M" });

  return (
    <div className="mt-3 grid items-center gap-4 rounded-xl bg-[#edf4ef] p-4 sm:grid-cols-[12rem_1fr]">
      <Image src={qr} alt={"Scan to pay the platform fee of " + formatFreight(amount)} width={256} height={256} unoptimized
        className="mx-auto h-auto w-48 max-w-full rounded-lg bg-white" />
      <div className="min-w-0">
        <p className="text-lg font-extrabold">{formatFreight(amount)} platform fee</p>
        <p className="mt-1 text-sm">Pay {name} at <span className="break-all font-semibold">{payee}</span>.</p>
        <p className="mt-2 text-sm">Scan with your UPI app or open it on this phone. Check the recipient and amount before confirming.</p>
        <a href={uri} className="button mt-3">Open UPI app</a>
      </div>
    </div>
  );
}