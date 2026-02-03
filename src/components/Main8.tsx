import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import appBanner from "../images/b7be88be-5b20-48cd-8847-83778cffebbe-md.jpeg";

interface Main8Data {
  id: number;
  title: string;
  text: string;
  img: string;
}

function Main8() {
  const [data, setData] = useState<Main8Data | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await apiFetch<Main8Data[]>("/main8/");
        if (items.length > 0) {
          setData(items[0]);
        }
      } catch (error) {
        console.error("Main8 fetch error:", error);
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return (
      <div className="product-loading">
        <div className="spinner" />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <section className="main8" id="app">
      <div className="text">
        <h1>{data.title}</h1>
        <p>{data.text}</p>

        <div className="btnn">
          <a className="store-btn" href="https://play.google.com/store" target="_blank" rel="noreferrer">
            Google Play
          </a>
          <a className="store-btn" href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer">
            App Store
          </a>
        </div>
      </div>

      <div className="img">
        <img src={appBanner} className="app-image" alt={data.title} />
      </div>
    </section>
  );
}

export default Main8;
