import React, { useState, useEffect, useRef } from 'react';
import OpenAI from 'openai';
import './AiChefBot.css'; // Stil dosyasını import edeceğiz

// API Anahtarınızı buraya girin
const OPENAI_API_KEY = '';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Tarayıcı ortamında kullanım için
});

const AiChefBot = ({ restaurants, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // İlk açılış mesajı
    setMessages([
      {
        role: 'assistant',
        content: 'Merhaba! Ben Yuumi AI Chef. Bugün ne yemek istersin? Sana restoranlarımızdan harika önerilerde bulunabilirim.'
      }
    ]);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    // Restoran bilgilerini ve TÜM menü öğelerinin isimlerini prompt'a ekle
    const restaurantInfoForPrompt = restaurants.map(r => {
      const menuItems = r.items || r.menu || []; // "items" veya "menu" dizisini kontrol et
      const menuNames = menuItems.length > 0
        ? menuItems.map(item => item.name || item.isim).join(', ') // Sadece isimleri al
        : 'Menü bilgisi şu an için kısıtlı';
      return `${r.isim || r.name} (Kategori: ${r.kategori || r.category}. Menüde bulunanlar: ${menuNames})`;
    }).join('; ---- '); // Restoranları birbirinden ayırmak için daha belirgin bir ayraç

    const systemMessageContent = `Sen Yuumi AI Chef adında, kullanıcılara yemek ve restoran önerilerinde bulunan bir yapay zeka asistanısın. Amacın, kullanıcının yeme isteğine en uygun seçenekleri sunmak ve eğer isterse sipariş vermesine veya haftalık planına eklemesine yardımcı olmaktır. Samimi, arkadaş canlısı ve davetkar bir dil kullan. Fiyat bilgisi verme.

Mevcut restoranlar, kategorileri ve menü detayları şunlardır:
${restaurantInfoForPrompt}

ANA GÖREVLERİN:
1.  **Yemek ve Restoran Önerisi:** Kullanıcının belirttiği malzemelere (örn: marul, tavuk, acı), yemek türlerine (örn: çorba, kebap, tatlı), açıklamalara veya genel isteklere (örn: hafif bir şeyler) göre yukarıdaki listeden uygun yemekleri ve bu yemekleri bulabileceği restoranları öner.
    *   Kullanıcı spesifik bir restoran adı verirse (örn: "Tatlı Dünyası'ndan bir tatlı"), öncelikle o restoranın menüsünden öneri yap.
    *   Kullanıcı genel bir istekte bulunursa (örn: "canım kebap çekti"), uygun kategorideki restoranları ve menülerini değerlendir.
    *   Eğer isteğe uygun bir şey bulamazsan, kibarca belirt ve alternatif sunmaya çalış.

2.  **Sepete Ekleme (Function Calling):** Kullanıcı bir yemeği sepetine eklemek istediğini net bir şekilde ifade ederse (örn: "Harput Kebap'tan Adana Kebap sipariş etmek istiyorum", "Bunu sepete ekle"), aşağıdaki kurallara göre 'addItemToCart' fonksiyonunu çağır:
    *   Gerekli bilgiler: 'restaurantName' (restoranın tam adı), 'menuItemName' (yemeğin tam adı).
    *   'quantity' isteğe bağlıdır, belirtilmezse 1 kabul et.
    *   Eğer restoran veya yemek adı belirsizse, fonksiyonu çağırmadan önce kullanıcıdan netleştirmesini iste.

3.  **Haftalık Plana Ekleme (Function Calling):** Kullanıcı bir yemeği haftalık planına eklemek istediğini belirtirse (örn: "Pazartesi öğlene Elazığ Sofrası'ndan Kuru Fasulye ekle"), 'addMealToWeeklyPlan' fonksiyonunu çağır:
    *   Gerekli bilgiler: 'dayOfWeek' (Pazartesi, Salı vb.), 'mealTime' (Öğle, Akşam vb.), 'restaurantName', 'menuItemName'.
    *   Bilgiler eksikse, fonksiyonu çağırmadan önce kullanıcıdan tamamlamasını iste.

GENEL İLKELER:
*   Kullanıcıya doğrudan "Ne yapmak istersin?" gibi genel sorular yerine, onun ifadelerinden niyetini anlamaya çalış.
*   Önerilerini yaparken, menüdeki açıklamaları (örn: "Acılı, lavaş ve salata ile") dikkate al.
*   Kullanıcıya hangi restoranın hangi yemeği sunduğunu net bir şekilde belirt.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "addItemToCart",
          description: "Kullanıcının belirttiği restorandan, belirttiği yemeği sepete ekler.",
          parameters: {
            type: "object",
            properties: {
              restaurantName: {
                type: "string",
                description: "Yemeğin sipariş edileceği restoranın adı, örneğin 'Harput Kebap Salonu'",
              },
              menuItemName: {
                type: "string",
                description: "Sipariş edilecek yemeğin adı, örneğin 'Adana Kebap'",
              },
              quantity: {
                type: "integer",
                description: "Sipariş edilecek yemek adedi, varsayılan 1",
                default: 1,
              },
            },
            required: ["restaurantName", "menuItemName"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "addMealToWeeklyPlan",
          description: "Kullanıcının belirttiği bir yemeği, belirttiği gün ve öğün için haftalık yemek planına ekler.",
          parameters: {
            type: "object",
            properties: {
              dayOfWeek: { 
                type: "string", 
                description: "Yemeğin ekleneceği haftanın günü, örneğin 'Pazartesi'",
              },
              mealTime: { 
                type: "string",
                description: "Yemeğin ekleneceği öğün veya zaman, örneğin 'Öğle Yemeği'",
              },
              restaurantName: {
                type: "string",
                description: "Yemeğin alınacağı restoranın adı",
              },
              menuItemName: {
                type: "string",
                description: "Haftalık plana eklenecek yemeğin adı",
              },
            },
            required: ["dayOfWeek", "mealTime", "restaurantName", "menuItemName"],
          },
        },
      },
    ];

    try {
      let currentTurnMessages = [
        { role: "system", content: systemMessageContent },
        ...messages.filter(msg => msg.role !== 'system'),
        userMessage
      ];

      let completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: currentTurnMessages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.6,
      });

      let assistantResponse = completion.choices[0].message;

      if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
        setMessages(prev => [...prev, assistantResponse]);

        const toolCall = assistantResponse.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResultContent = "";

        if (functionName === "addItemToCart") {
          const targetRestaurant = restaurants.find(r => (r.isim || r.name)?.toLowerCase() === functionArgs.restaurantName?.toLowerCase());
          const menuItem = targetRestaurant?.items?.find(m => (m.isim || m.name)?.toLowerCase() === functionArgs.menuItemName?.toLowerCase()) ||
                           targetRestaurant?.menu?.find(m => (m.isim || m.name)?.toLowerCase() === functionArgs.menuItemName?.toLowerCase());

          if (targetRestaurant && menuItem) {
            console.log(`SİPARİŞ VERİLİYOR (mock): ${functionArgs.quantity || 1} adet ${functionArgs.menuItemName}, ${functionArgs.restaurantName} restoranından.`);
            functionResultContent = `${functionArgs.quantity || 1} adet ${functionArgs.menuItemName}, ${functionArgs.restaurantName} restoranından başarıyla sepete eklendi! Başka bir isteğin var mı?`;
          } else {
            functionResultContent = `Üzgünüm, ${functionArgs.restaurantName} restoranında ${functionArgs.menuItemName} yemeğini bulamadım. Başka bir şey denemek ister misin?`;
          }
        } else if (functionName === "addMealToWeeklyPlan") {
          console.log(`HAFTALIK PLANA EKLENİYOR (mock): ${functionArgs.dayOfWeek} ${functionArgs.mealTime} için ${functionArgs.menuItemName}, ${functionArgs.restaurantName} restoranından.`);
          functionResultContent = `${functionArgs.menuItemName}, ${functionArgs.restaurantName} restoranından ${functionArgs.dayOfWeek} ${functionArgs.mealTime} planına eklendi. Başka bir arzun var mı?`;
        } else {
          functionResultContent = `Bilinmeyen bir fonksiyon çağrısı: ${functionName}.`;
        }

        currentTurnMessages.push(assistantResponse);
        currentTurnMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResultContent,
        });

        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: currentTurnMessages,
        });
        assistantResponse = completion.choices[0].message;
      }

      if (assistantResponse.content) {
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: assistantResponse.content.trim() }]);
      } else if (!assistantResponse.tool_calls) {
        console.warn("Assistant response has no content and no tool_calls:", assistantResponse);
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: 'Bir şeyler ters gitti, ama ne olduğunu anlayamadım. Tekrar deneyebilir misin?' }]);
      }

    } catch (error) {
      console.error("OpenAI API Hatası:", error);
      let errorMessage = 'Yemek önerisi alırken bir sorun oluştu.';
      if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
        errorMessage += ` Detay: ${error.response.data.error.message}`;
      }
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: errorMessage }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="ai-chef-bot-container">
      <div className="bot-header">
        <h3>Yuumi AI Chef</h3>
        <button onClick={onClose} className="close-bot-btn">×</button>
      </div>
      <div className="bot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="bot-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ne yemek istersin?"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </form>
    </div>
  );
};

export default AiChefBot; 