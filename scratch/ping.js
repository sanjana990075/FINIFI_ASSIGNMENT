async function main() {
  try {
    const res = await fetch('http://localhost:4000/');
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error('Error pinging server:', err.message);
  }
}
main();
