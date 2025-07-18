import { Text } from "react-native";

export const renderFormattedText = (text) => {
  const lines = text.split("\n");
  const result = [];

  lines.forEach((line, lineIndex) => {
    if (line.trim() === "") {
      result.push(<Text key={`empty-${lineIndex}`}>{"\n"}</Text>);
      return;
    }

    if (/^\*\s/.test(line)) {
      result.push(
        <Text key={`bullet-${lineIndex}`} style={{ marginLeft: 10 }}>
          {"\n• "}
          {line.substring(2).trim()}
        </Text>
      );
      return;
    }

    const parts = [];
    let remainingText = line;

    while (remainingText.length > 0) {
      const boldItalicMatch = remainingText.match(/^\*\*\*([^*]+)\*\*\*/);
      if (boldItalicMatch) {
        parts.push(
          <Text
            key={`bi-${lineIndex}-${parts.length}`}
            style={{ fontWeight: "bold", fontStyle: "italic" }}
          >
            {boldItalicMatch[1]}
          </Text>
        );
        remainingText = remainingText.substring(boldItalicMatch[0].length);
        continue;
      }

      const boldMatch = remainingText.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <Text
            key={`b-${lineIndex}-${parts.length}`}
            style={{ fontWeight: "bold" }}
          >
            {boldMatch[1]}
          </Text>
        );
        remainingText = remainingText.substring(boldMatch[0].length);
        continue;
      }

      const italicMatch = remainingText.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        parts.push(
          <Text
            key={`i-${lineIndex}-${parts.length}`}
            style={{ fontStyle: "italic" }}
          >
            {italicMatch[1]}
          </Text>
        );
        remainingText = remainingText.substring(italicMatch[0].length);
        continue;
      }

      const nextFormat = remainingText.search(/\*\*\*|\*\*|\*/);
      if (nextFormat >= 0) {
        parts.push(
          <Text key={`t-${lineIndex}-${parts.length}`}>
            {remainingText.substring(0, nextFormat)}
          </Text>
        );
        remainingText = remainingText.substring(nextFormat);
      } else {
        parts.push(
          <Text key={`t-${lineIndex}-${parts.length}`}>{remainingText}</Text>
        );
        remainingText = "";
      }
    }

    result.push(<Text key={`line-${lineIndex}`}>{parts}</Text>);
  });

  return result;
};
