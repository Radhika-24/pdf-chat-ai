import React, { useState } from "react";
import axios from "axios";
import { Input, MessageList } from "react-chat-elements";

function App() {
  const [pdfId, setPdfId] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);

  const uploadPDF = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setPdfId(response.data.pdfId);
      setChat([
        ...chat,
        {
          position: "left",
          type: "text",
          title: "system",
          text: "PDF uploaded successfully.",
        },
      ]);
    } catch (error) {
      console.error("Error uploading PDF:", error);
    }
  };

  const askQuestion = async () => {
    if (!pdfId) {
      alert("Please upload a PDF first.");
      return;
    }

    try {
      const response = await axios.post("/ask", { question, pdfId });
      setChat([
        ...chat,
        {
          position: "right",
          type: "text",
          title: "You",
          text: question,
        },
        {
          position: "left",
          type: "text",
          title: "bot",
          text: response.data.answer,
        },
      ]);
      setQuestion("");
    } catch (error) {
      console.error("Error asking question:", error);
    }
  };

  return (
    <>
      <div style={{ backgroundColor: "#ededed", padding: "10px" }}>
        <h1>Chat with PDF</h1>
        <input type="file" onChange={uploadPDF} />
        <br />
        <div className="chatbox">
          <MessageList
            className="message-list"
            lockable={true}
            toBottomHeight={"100MessageList%"}
            dataSource={chat}
          />
          <br />
          <Input
            style={{ marginTop: "10px" }}
            placeholder="Type here..."
            multiline={true}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button style={{ marginTop: "10px" }} onClick={askQuestion}>
            Ask
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
