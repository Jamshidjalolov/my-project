import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../pages/admin/component/Firebase";


function useCategory() {
    const [category, setCategory] = useState<any[]>([])

    useEffect(() => {
        const unSub = onSnapshot(collection(db, "category"), (snapshot) => {
            setCategory(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });
        return () => unSub();
    }, [])

    return { category }
}

export default useCategory