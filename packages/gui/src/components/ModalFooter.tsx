export default function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
      {children}
    </footer>
  );
}
