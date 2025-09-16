import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import dotenv from "dotenv"

dotenv.config()

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [userName, setUserName] = useState("");
  const [convoState, setConvoState] = useState("awaiting_name");

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentInput = input; 
    if (convoState === "awaiting_name") {
      setUserName(currentInput);

      const botReply = {
        role: 'assistant',
        content: `Nice to meet you, ${currentInput}! To create your perfect trip, how many days are you planning for?`
      };

      setMessages([...newMessages, botReply]);
      setConvoState("planning"); // Move to the next phase!

    } else if (convoState === "planning") {
      // 3. THE ORIGINAL API CALL LOGIC now runs in the 'planning' phase.
      setIsLoading(true);
      try {
        const res = await axios.post(process.env.BACKEND_URL, {
          // You can optionally send the userName to the backend for even more personalization
          // userName: userName, 
          messages: newMessages,
        });
        setMessages([...newMessages, { role: "assistant", content: res.data.reply }]);
      } catch (error) {
        console.error("Axios Error:", error);
        setMessages([...newMessages, { role: "assistant", content: "Sorry, an error occurred. Please try again." }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-lg p-4 flex flex-col h-[85vh]">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">Jharkhand Travel Planner</h1>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-2">
          {/* Static Greeting */}
          <div className="p-3 rounded-lg bg-gray-200 text-black max-w-xs break-words mr-auto">
            Hi! I can help plan your Jharkhand trip. Let me know your name to get started.
          </div>

          {/* Dynamic Conversation */}
          {messages.map((m, i) => {
            // Check if this is the final itinerary message
            if (m.role === "assistant" && m.content.includes("1. Summary:")) {
              return <ItineraryMessage key={i} content={m.content} />;
            }
            
            // Render a normal chat bubble
            return (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-xs break-words ${
                  m.role === "user" 
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-200 text-black mr-auto"
                }`}
              >
                {m.content}
              </div>
            );
          })}

          {isLoading && <div className="p-3 rounded-lg bg-gray-200 text-black max-w-xs break-words mr-auto">Assistant is typing...</div>}

        </div>
        <div className="flex">
          <input
            className="flex-1 border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder={convoState === 'awaiting_name' ? "Please enter your name..." : "Type your message..."}
            disabled={isLoading}
          />
          <button
            className="bg-blue-500 text-white px-4 rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
            onClick={sendMessage}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Full ItineraryMessage Component (for copy-pasting) ---
const ItineraryMessage = ({ content }) => {
  const parsedData = useMemo(() => {
    const sections = content.split(/\n-{3,}\n/);
    const data = {};
    const parseLink = (str) => {
      const match = /\[(.*?)\]\((.*?):\/\/(.*?)\)/.exec(str);
      if (!match) return null;
      return { text: match[1], protocol: match[2], value: match[3] };
    };
    const parseListItems = (text) => {
      if (!text) return [];
      return text.split('\n- ').slice(1).map(line => {
        const titleMatch = line.match(/\*\*(.*?):\*\*/);
        const description = line.replace(/\*\*(.*?):\*\*/, '').split('[')[0].trim();
        return {
          title: titleMatch ? titleMatch[1] : 'Unknown',
          description,
          action: parseLink(line),
        };
      });
    };
    const firstSection = sections[0] || '';
    data.summary = firstSection.match(/\*\*1\. Summary:\*\*([\s\S]*?)\*\*2\. Itinerary:\*\*/)?.[1]?.trim();
    data.itinerary = firstSection.match(/\*\*2\. Itinerary:\*\*([\s\S]*)/)?.[1]?.trim().split('* ').slice(1).map(item => item.trim());
    sections.forEach(sec => {
      if (sec.includes('Top Accommodation Picks')) { data.accommodations = parseListItems(sec); }
      else if (sec.includes('Choose Your Expert Guide')) { data.guides = parseListItems(sec); }
      else if (sec.includes('Final Actions')) { data.finalActions = sec.match(/\[.*?\]\(.*?\)/g).map(parseLink); }
    });
    return data;
  }, [content]);

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Your Personalized Trip Plan</h2>
      <p className="text-gray-600 mb-4">{parsedData.summary}</p>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">🗓️ Itinerary</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          {parsedData.itinerary?.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
      {parsedData.accommodations?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🏨 Accommodation Picks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {parsedData.accommodations.map((item, i) => (
              <div key={i} className="border rounded-lg p-3">
                <p className="font-bold">{item.title}</p>
                <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                <button className="text-sm text-blue-500 font-semibold" onClick={() => alert(`Action: ${item.action.protocol}://${item.action.value}`)}>
                  {item.action.text}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {parsedData.guides?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">👤 Choose Your Guide</h3>
          <div className="space-y-2">
            {parsedData.guides.map((item, i) => (
               <div key={i} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <button className="bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-lg" onClick={() => alert(`Action: ${item.action.protocol}://${item.action.value}`)}>
                  {item.action.text}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 border-t pt-4 flex flex-col md:flex-row gap-2">
        {parsedData.finalActions?.map((action, i) => (
          <button key={i} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600" onClick={() => alert(`Action: ${action.protocol}://${action.action}`)}>
            {action.text}
          </button>
        ))}
      </div>
    </div>
  );
};
