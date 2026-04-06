interface WhatsAppButtonProps {
  whatsappNumber: string;
  businessName: string;
  displayNumber: string;
}

export default function WhatsAppButton({
  whatsappNumber,
  businessName,
  displayNumber,
}: WhatsAppButtonProps) {
  const message = encodeURIComponent(
    `Hi! I've joined the queue at ${businessName}. My queue number is ${displayNumber}.`
  );
  const href = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-button"
    >
      Connect on WhatsApp
    </a>
  );
}
