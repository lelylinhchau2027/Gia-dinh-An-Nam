import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Text } from "react-native";
import { Card, LinkButton, Screen } from "../../src/components/ui";
import { handbookArticles } from "../../src/data/handbook";
import {
  legacyPregnancyExaminations,
  formatLegacyRange,
} from "../../src/data/reference";
import { formStyles as s } from "../../src/components/forms";

export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = handbookArticles.find((a) => a.id === id);
  const pregnancy = legacyPregnancyExaminations.find((a) => a.id === id);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(`bookmark:${id}`)
      .then((v) => setSaved(v === "1"))
      .catch(() => undefined);
  }, [id]);
  return (
    <Screen>
      <Text style={s.title}>
        {article?.title ?? pregnancy?.title ?? "Không tìm thấy nội dung"}
      </Text>
      <LinkButton
        title={saved ? "♥ Đã lưu — bỏ lưu" : "♡ Lưu để đọc lại"}
        onPress={async () => {
          await AsyncStorage.setItem(`bookmark:${id}`, saved ? "0" : "1");
          setSaved(!saved);
        }}
      />
      {article ? (
        <>
          <Text style={s.hint}>{article.category}</Text>
          <Text style={s.body}>{article.body}</Text>
          <Card style={s.gap}>
            <Text style={s.hint}>Nguồn: {article.source}</Text>
            <Text style={s.hint}>
              {article.reviewed
                ? `Đối chiếu ngày ${article.reviewed}`
                : "Nội dung hướng dẫn / mẫu tham khảo"}
            </Text>
            {article.url ? (
              <LinkButton
                title="Đọc nguồn chính thức"
                onPress={() => {
                  void Linking.openURL(article.url!);
                }}
              />
            ) : null}
          </Card>
        </>
      ) : null}
      {pregnancy ? (
        <>
          <Text style={s.hint}>
            {formatLegacyRange(pregnancy)} · Dữ liệu gốc chưa rà soát lại
          </Text>
          <Text style={s.body}>{pregnancy.description}</Text>
          {pregnancy.extraItems.map((item, i) => (
            <Card key={i}>
              <Text style={s.label}>{item.name}</Text>
              <Text style={s.body}>{item.value}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
