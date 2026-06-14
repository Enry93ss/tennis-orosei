import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CLUB_CODE = "TENNISOROSEI";
const ADMIN_CODE = "ADMINOROSEI";

const courts = ["Campo Via Genova", "Campo Orthilippa"];

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getAllowedDates() {
  const dates = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function App() {
  const [access, setAccess] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({
    court: courts[0],
    booking_date: getAllowedDates()[0],
    start_time: "08:30",
    duration: 60,
    player_names: ""
  });
  const [message, setMessage] = useState("");

  const allowedDates = getAllowedDates();

  useEffect(() => {
    if (access) fetchBookings();
  }, [access]);

  async function fetchBookings() {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (!error) setBookings(data);
  }

  function login() {
    if (codeInput === CLUB_CODE) setAccess("user");
    else if (codeInput === ADMIN_CODE) setAccess("admin");
    else setMessage("Codice non valido.");
  }

  function timeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function hasOverlap(newBooking) {
    const newStart = timeToMinutes(newBooking.start_time);
    const newEnd = newStart + Number(newBooking.duration);

    return bookings.some((b) => {
      if (b.court !== newBooking.court) return false;
      if (b.booking_date !== newBooking.booking_date) return false;

      const existingStart = timeToMinutes(b.start_time);
      const existingEnd = existingStart + Number(b.duration);

      return newStart < existingEnd && newEnd > existingStart;
    });
  }

  async function createBooking(e) {
    e.preventDefault();
    setMessage("");

    if (!form.player_names.trim()) {
      setMessage("Inserisci nome e cognome dei giocatori.");
      return;
    }

    if (!allowedDates.includes(form.booking_date)) {
      setMessage("Puoi prenotare solo oggi, domani o dopodomani.");
      return;
    }

    const start = timeToMinutes(form.start_time);
    const end = start + Number(form.duration);

    if (start < timeToMinutes("08:30") || end > timeToMinutes("22:30")) {
      setMessage("L'orario deve essere tra le 08:30 e le 22:30.");
      return;
    }

    if (hasOverlap(form)) {
      setMessage("Questo campo è già prenotato in quell'orario.");
      return;
    }

    const cancellationCode = generateCode();

    const { error } = await supabase.from("bookings").insert([
      {
        ...form,
        duration: Number(form.duration),
        cancellation_code: cancellationCode
      }
    ]);

    if (error) {
      setMessage("Errore durante la prenotazione.");
      return;
    }

    setMessage(`Prenotazione confermata. Codice cancellazione: ${cancellationCode}`);
    setForm({ ...form, player_names: "" });
    fetchBookings();
  }

  async function deleteBooking(id, savedCode) {
    if (access !== "admin") {
      const input = prompt("Inserisci il codice cancellazione:");
      if (input !== savedCode) {
        alert("Codice errato.");
        return;
      }
    }

    await supabase.from("bookings").delete().eq("id", id);
    fetchBookings();
  }

  if (!access) {
    return (
      <div className="container">
        <h1>Prenotazioni Tennis Orosei</h1>
        <p>Inserisci il codice del circolo per accedere.</p>

        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          placeholder="Codice accesso"
        />

        <button onClick={login}>Entra</button>

        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Prenotazioni Tennis Orosei</h1>

      <form onSubmit={createBooking} className="card">
        <h2>Nuova prenotazione</h2>

        <label>Campo</label>
        <select
          value={form.court}
          onChange={(e) => setForm({ ...form, court: e.target.value })}
        >
          {courts.map((court) => (
            <option key={court}>{court}</option>
          ))}
        </select>

        <label>Data</label>
        <select
          value={form.booking_date}
          onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
        >
          {allowedDates.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>

        <label>Ora inizio</label>
        <input
          type="time"
          min="08:30"
          max="21:30"
          step="1800"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
        />

        <label>Durata</label>
        <select
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
        >
          <option value={60}>60 minuti</option>
          <option value={90}>90 minuti</option>
        </select>

        <label>Nome e cognome giocatori</label>
        <textarea
          value={form.player_names}
          onChange={(e) => setForm({ ...form, player_names: e.target.value })}
          placeholder="Es. Mario Rossi, Luca Bianchi"
        />

        <button type="submit">Prenota</button>
      </form>

      {message && <p className="message">{message}</p>}

      <h2>Prenotazioni</h2>

      {bookings.length === 0 && <p>Nessuna prenotazione presente.</p>}

      {bookings.map((b) => (
        <div className="booking" key={b.id}>
          <strong>{b.booking_date}</strong>
          <p>{b.court}</p>
          <p>
            {b.start_time} - {b.duration} minuti
          </p>
          <p>{b.player_names}</p>

          <button className="delete" onClick={() => deleteBooking(b.id, b.cancellation_code)}>
            Cancella
          </button>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
