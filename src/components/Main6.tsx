import { useEffect, useState } from "react";
import { apiFetch, resolveImageUrl } from "../lib/api";

interface Main6Data {
  id: number;
  title: string;
  text: string;
  image: string;
}

function Main6() {
  const [data, setData] = useState<Main6Data[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = await apiFetch<Main6Data[]>("/main6/");
        setData(list);
      } catch (err) {
        console.error("Main6 fetch error:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <section className="main6" id="features">
      {data.slice(0, 1).map((item) => (
        <div key={item.id} className="box">
          <div className="img">
            {item.image && <img src={resolveImageUrl(item.image)} alt={item.title} />}
          </div>
          <div className="text">
            <h1>{item.title}</h1>
            <p>{item.text}</p>
            <a className="btn-outline" href="#shop">
              Find now
            </a>
          </div>
        </div>
      ))}
    </section>
  );
}

export default Main6;
