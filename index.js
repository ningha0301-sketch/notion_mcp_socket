import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

const app = express();

const apiKey = process.env.NOTION_API_KEY;
if (!apiKey) throw new Error("NOTION_API_KEY 환경 변수가 없습니다!");

const notion = new Client({ auth: apiKey });

const server = new McpServer({
  name: "NotionSSE",
  version: "1.0.0",
});

server.tool(
  "search_notion",
  { query: z.string().describe("검색할 키워드 (비워두면 최근 페이지)") },
  async ({ query }) => {
    try {
      const response = await notion.search({ 
        query: query,
        page_size: 5 
      });
    
      const simplified = response.results.map(item => {
        const title = item.properties?.Name?.title?.[0]?.plain_text 
                   || item.properties?.title?.title?.[0]?.plain_text 
                   || "제목 없음";
        return `[${item.object}] ${title} (${item.url})`;
      });

      return { content: [{ type: "text", text: simplified.join("\n") }] };
    } catch (e) {
      return { content: [{ type: "text", text: `에러 발생: ${e.message}` }] };
    }
  }
);

app.get("/sse", async (req, res) => {
  console.log("OpenAI가 연결을 시도합니다...");
  const transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버가 ${PORT} 포트에서 시작되었습니다.`));
