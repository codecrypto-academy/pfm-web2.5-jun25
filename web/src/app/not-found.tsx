export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center',
    }}>
      <h1 style={{ color: 'red', fontSize: '2rem', marginBottom: '1rem' }}>404 - Not Found</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}