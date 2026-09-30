import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Article } from "@/features/learn/Article";
import { adviceQuery } from "@/lib/queries";

export default function AdviceArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery(adviceQuery(slug));
  return (
    <Article
      query={query}
      webPath={`/advice/${slug}`}
      eyebrow={query.data?.category ?? "Legal guide"}
    />
  );
}
