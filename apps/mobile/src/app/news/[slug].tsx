import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Article } from "@/features/learn/Article";
import { newsQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export default function NewsArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery(newsQuery(slug));
  const post = query.data;
  const meta = post
    ? [post.source, post.author_name, post.published_at ? formatDate(post.published_at) : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <Article
      query={{ ...query, data: post ? { ...post, meta } : post }}
      webPath={`/news/${slug}`}
      eyebrow="Legal news"
    />
  );
}
