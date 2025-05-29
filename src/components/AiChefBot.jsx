import React, { useState, useEffect, useRef } from 'react';
import OpenAI from 'openai';
import './AiChefBot.css'; // Stil dosyasını import edeceğiz

// API Anahtarınızı buraya girin
const OPENAI_API_KEY = '';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Tarayıcı ortamında kullanım için
});

const AiChefBot = ({ restaurants, onClose, onAddToCart }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [focusedRestaurant, setFocusedRestaurant] = useState(null);

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
    if (!input.trim() || isLoading) return;

    const newUserMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    let systemMessageContentForAPI = "";
    let toolsToUseForAPI = undefined;
    let toolChoiceToUseForAPI = undefined;

    if (focusedRestaurant) {
      // AŞAMA 2: Spesifik Restoran Menüsü ile Sorgulama
      const currentFocusedRestaurantInfo = `RESTORAN: ${focusedRestaurant.isim}\nKATEGORİ: ${focusedRestaurant.kategori}\nMENÜSÜ:\n  ${(focusedRestaurant.menu || []).map(item => `- ${item.isim} ${item.aciklama ? '('+item.aciklama+')' : ''}`).join('\n  ') || '  Menü bilgisi kısıtlı.'}`;
      systemMessageContentForAPI = `Sen Yuumi AI Chef adında, son derece yardımsever, dikkatli ve bilgili bir yemek öneri asistanısın.
Kullanıcı şu anda "${focusedRestaurant.isim}" restoranı hakkında konuşuyor veya bu restorandan bir şeyler istiyor.
SANA SAĞLANAN BİLGİ KAYNAĞI (BAŞKA BİR YERE BAKMA, SADECE BUNU KULLAN):
${currentFocusedRestaurantInfo}

ANA GÖREVLERİN VE DAVRANIŞ KURALLARIN:
1.  **Yemek ve Restoran Önerisi (Restoran Odaklı):**
    *   Kullanıcının isteğini (belirttiği malzemeler, ana yemek adı, yemek türü, restoran adı vb.) dikkatlice analiz et.
    *   Kullanıcı spesifik bir restoran adı verirse (örn: "${focusedRestaurant.isim}'de ne var?"), **SADECE VE SADECE** o restoran için sana verdiğim menü listesini (yukarıdaki ${currentFocusedRestaurantInfo} içinde) dikkatlice incele.
    *   **EŞLEŞTİRME KURALI:** Kullanıcının sorduğu bir yemek adı (örn: "tavuk döner"), menüdeki bir yemek adıyla (örn: "Tavuk Döner Dürüm") **TAM OLARAK AYNI OLMASA BİLE**, eğer kullanıcının sorduğu ifade menüdeki ifadenin **ANA BİLEŞENİNİ veya KISALTMASINI** içeriyorsa (örn: "tavuk döner" -> "Tavuk Döner Dürüm" ile eşleşir; "dürüm" -> "Tavuk Döner Dürüm" veya "Et Döner Dürüm" ile eşleşebilir), bunu geçerli bir bulgu olarak kabul et.
    *   Eğer menüde kullanıcının sorduğu spesifik bir yemek (veya yukarıdaki eşleştirme kuralına göre yakın bir seçenek) varsa, "Evet, ${focusedRestaurant.isim}'nin menüsünde [Menüdeki Tam Yemek Adı] bulunuyor! [İsteğe bağlı ek bilgi veya soru]" gibi net bir cevap ver. (Örneğin, kullanıcı "tavuk döner" sorarsa ve menüde "Tavuk Döner Dürüm" varsa, "Evet, ${focusedRestaurant.isim}'nin menüsünde Tavuk Döner Dürüm bulunuyor!" demelisin.)
    *   Eğer o restoranın menüsünde kullanıcının istediğine yakın veya onu içeren HİÇBİR ürün yoksa, "Maalesef, ${focusedRestaurant.isim}'nin menüsünde [Aranan Yemek] veya benzeri bir seçenek göremedim. Ama menüde şunlar var: [O restorandan birkaç alakasız olmayan örnek]. Ya da başka bir restorana bakabiliriz." gibi bir cevap ver.
    *   ASLA fiyat bilgisi verme.

2.  **Sepete Ekleme (Fonksiyon Çağırma - 'addItemToCart'):**
    *   Kullanıcı bir yemeği sepetine eklemek istediğini net bir şekilde ifade ederse (örn: "profiterolü sepete ekle", "Adana Kebap sipariş etmek istiyorum", "Tamam, bunu sepete atalım", "Evet, ekleyebilirsin"), 'addItemToCart' fonksiyonunu çağırmalısın.
    *   'restaurantName' parametresi için "${focusedRestaurant.isim}" kullanmalısın.
    *   'menuItemName' parametresini kullanıcının mesajından veya menüdeki eşleşen yemekten (eşleştirme kuralına göre bulduğun tam menü öğesi adını) çıkar.
    *   Eğer 'menuItemName' net değilse, fonksiyonu çağırma, kullanıcıya sor.

GENEL İLKELER:
*   Konuşmanın akışını ve önceki mesajları dikkate al.
*   Verilen menü bilgisine %100 sadık kal. Bilmiyorsan, bilmiyorum de.
*   Cevapların net ve doğrudan olsun.`;
      toolsToUseForAPI = tools; // Fonksiyonları bu aşamada kullanabiliriz
      toolChoiceToUseForAPI = "auto";
      console.log(`Odaklanılan restoran: ${focusedRestaurant.isim}. Sistem mesajı ve araçlar güncellendi (Detaylı Eşleştirme Kuralı Eklendi).`);

    } else {
      // AŞAMA 1: Restoran Tespiti veya Genel Sorgu (focusedRestaurant TANIMLI DEĞİL)
      const allRestaurantsOverview = restaurants.map(r => {
        const menuItems = r.menu || [];
        const sampleMenuItems = menuItems.slice(0, 3).map(item => item.isim).join(', ');
        return `RESTORAN: ${r.isim}\nKATEGORİ: ${r.kategori}\nBAZI MENÜ ÖĞELERİ: ${sampleMenuItems || 'Mevcut değil'}`;
      }).join('\n\n====================\n\n');

      systemMessageContentForAPI = `Sen Yuumi AI Chef adında, son derece yardımsever, dikkatli ve bilgili bir yemek öneri asistanısın. Senin görevin, kullanıcının yeme isteğine en uygun restoranları önermek.
Konuşma tarzın samimi, arkadaş canlısı ve davetkar olmalı. ASLA fiyat bilgisi verme. Cevapların net ve doğrudan olsun.

SANA SAĞLANAN BİLGİ KAYNAĞI (BAŞKA BİR YERE BAKMA, SADECE BUNU KULLAN):
Aşağıda mevcut restoranlar ve kategorileri bulunmaktadır. Tüm cevaplarını ve önerilerini MUTLAKA ve SADECE bu listedeki bilgilere dayandır.
${allRestaurantsOverview}

ANA GÖREVLERİN VE DAVRANIŞ KURALLARIN:
1.  **Restoran Önerisi:**
    *   Kullanıcının isteğini (belirttiği malzemeler, yemek türleri, genel ruh hali vb.) dikkatlice analiz et.
    *   Kullanıcının isteğine uygun olabilecek birkaç restoran öner. Önerirken restoranın kategorisini de belirtebilirsin.
    *   Bu aşamada menü detaylarına çok fazla girme, sadece genel bir fikir ver. Kullanıcı bir restoran seçtikten sonra menü hakkında daha fazla bilgi verebilirsin.
    *   Kullanıcı bir restoran adı belirtirse (örn: "Lezzet Durağı Döner'den bir şeyler bakalım"), bir sonraki mesajında o restorana odaklanacağını ve o restoranın menüsünü inceleyeceğini belirt. Bu durumda kullanıcıya "Harika, Lezzet Durağı Döner'in menüsüne göz atalım. Oradan ne yemek istersin?" gibi bir geçiş yap.

ÖRNEK:
Kullanıcı: Canım acı bir şeyler çekti.
Sen: Acı lezzetler için Harput Kebap Salonu (Kebap) veya Acı Dünyası (Dünya Mutfağı) gibi yerlere bakabilirsin. Hangisiyle ilgilenirsin?

GENEL İLKELER:
*   Eğer bir restoran önerirsen ve kullanıcı olumlu yanıt verirse veya bir restoran seçerse, bir sonraki etkileşimde o restorana odaklanmak için durumu güncelle (Bu, setFocusedRestaurant çağrısı ile yapılır).
*   Verilen restoran listesine %100 sadık kal.`;
      // Genel sorgu aşamasında fonksiyon çağırmaya genellikle gerek yok.
      // Kullanıcı "X restoranından Y'yi sepete ekle" gibi çok spesifik bir ifade kullanmadıkça araçlar gönderilmez.
      // Bu durumu daha iyi yönetmek için kullanıcı mesajında "sepete ekle" gibi anahtar kelimeler kontrol edilebilir.
      // Şimdilik genel sorguda araçları göndermiyoruz.
      toolsToUseForAPI = undefined;
      toolChoiceToUseForAPI = undefined;
      console.log("Genel sorgu. Sistem mesajı güncellendi. Araçlar bu aşamada gönderilmiyor.");
    }

    const apiMessages = [
      { role: "system", content: systemMessageContentForAPI },
      ...messages.filter(msg => msg.role !== 'system'), 
      newUserMessage
    ];

    console.log("API'ye gönderilen mesajlar:", JSON.stringify(apiMessages, null, 2));

    try {
      const completionRequest = {
        model: "gpt-4o-mini",
        messages: apiMessages,
        temperature: 0.3, 
      };

      if (toolsToUseForAPI && toolsToUseForAPI.length > 0) {
        completionRequest.tools = toolsToUseForAPI;
        if (toolChoiceToUseForAPI) { 
            completionRequest.tool_choice = toolChoiceToUseForAPI;
        }
      }
      
      let completion = await openai.chat.completions.create(completionRequest);

      let assistantResponse = completion.choices[0].message;

      if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
        setMessages(prev => [...prev, assistantResponse]);

        const toolCall = assistantResponse.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResultContent = "";

        console.log(`GPT fonksiyon çağırmak istiyor: ${functionName}`, functionArgs);

        if (functionName === "addItemToCart") {
          console.log("addItemToCart fonksiyonu için GPT argümanları:", functionArgs);

          let rn = functionArgs.restaurantName;
          let mi = functionArgs.menuItemName;
          // let lastFunctionResultContent = ""; // Bu satır zaten yukarıda veya başka bir kapsamda olabilir, eğer gereksizse kaldırıldı.

          if (!rn || !mi) {
            // Sistem mesajı GPT'yi bu durumu ele alması için yönlendirdi.
            // GPT argümanları çıkaramazsa, kullanıcıya sorması beklenir.
            // Eğer GPT sormazsa ve argümanlar hala eksikse, burada bir fallback mesajı oluşturabiliriz.
            // Ancak ideal olan, GPT'nin sistem mesajına uyarak soru sormasıdır.
            // Şimdilik, GPT'nin sistem mesajına göre hareket edeceğini varsayıyoruz.
            // Eğer bu varsayım tutmazsa, buraya ek bir kontrol ve kullanıcıya direkt mesaj eklenebilir.
            // Örneğin:
            // functionResultContent = `Sepete eklemek için restoran ve yemek adını belirtmen gerekiyor. Örneğin: "Harput Kebap'tan Adana Kebap istiyorum."`;
            // Bu durumda, aşağıdaki if (rn && mi) bloğu çalışmayacak ve GPT'nin bir sonraki yanıtı (soru sorması beklenir) işlenecektir.
            // VEYA, GPT'nin sormasını beklemeden doğrudan bir hata mesajı gösterip işlemi durdurabiliriz:
            //
            // const assistantErrorMessage = { role: 'assistant', content: "Hangi restorandan hangi yemeği sepete eklemek istediğini anlayamadım. Lütfen belirtir misin?" };
            // setMessages(prevMessages => [...prevMessages, assistantErrorMessage]);
            // setIsLoading(false);
            // return; // Erken çıkış
            //
            // Şimdilik, GPT'nin sistem mesajı doğrultusunda eksik bilgiyi sormasını bekleyeceğiz.
            // Bu nedenle bu 'if' bloğunda doğrudan bir 'functionResultContent' ataması yapmıyoruz.
            // Eğer GPT bu senaryoda hala yanlış davranırsa, bu bloğa geri dönüp daha katı bir kontrol ekleyebiliriz.
            console.warn("addItemToCart için GPT tarafından restoran adı veya yemek adı çıkarılamadı. GPT'nin sorması bekleniyor.");
          }
          
          // Sadece rn ve mi varsa ve daha önce bir hata mesajı ayarlanmadıysa (functionResultContent boşsa) devam et
          if (rn && mi && !functionResultContent) { 
            const targetRestaurant = restaurants.find(r => (r.isim || r.name)?.toLowerCase() === rn.toLowerCase());
            const menuItem = targetRestaurant?.menu?.find(m => (m.isim || m.name)?.toLowerCase() === mi.toLowerCase());

            if (targetRestaurant && menuItem) {
              if (onAddToCart) {
                onAddToCart(targetRestaurant.id, targetRestaurant.isim, menuItem.id || menuItem.isim, menuItem.isim, functionArgs.quantity || 1);
                functionResultContent = `${functionArgs.quantity || 1} adet ${menuItem.isim}, ${targetRestaurant.isim} restoranından başarıyla sepetine eklendi! Başka bir isteğin var mı? 😊`;
              } else {
                console.error("onAddToCart fonksiyonu AiChefBot'a prop olarak geçirilmemiş!");
                functionResultContent = "Sepete ekleme fonksiyonunda bir sorun oluştu (onAddToCart prop eksik).";
              }
            } else {
              // Bu durum sistem mesajı tarafından zaten ele alınmalı (GPT menüde yoksa belirtmeli).
              // Ancak bir fallback olarak burada da bir mesaj olabilir.
              functionResultContent = `Üzgünüm, "${rn}" restoranında "${mi}" yemeğini bulamadım. Menüde bu ürün görünmüyor. Lütfen menüdeki ürünlerden birini seçin.`;
            }
          }
          // Eğer rn veya mi eksikse ve functionResultContent hala boşsa,
          // GPT'nin kullanıcıya soru sorması beklenir. Bu durumda functionResultContent boş kalır
          // ve bir sonraki turda GPT'nin yanıtı işlenir.
          // Eğer yukarıda bir hata mesajı atanmışsa (örn: prop eksik), o kullanılır.
          lastFunctionResultContent = functionResultContent; 
        } else if (functionName === "addMealToWeeklyPlan") {
          console.log(`HAFTALIK PLANA EKLENİYOR (mock): ${functionArgs.dayOfWeek} ${functionArgs.mealTime} için ${functionArgs.menuItemName}, ${functionArgs.restaurantName} restoranından.`);
          functionResultContent = `${functionArgs.menuItemName}, ${functionArgs.restaurantName} restoranından ${functionArgs.dayOfWeek} ${functionArgs.mealTime} planına eklendi. Başka bir arzun var mı?`;
        } else {
          functionResultContent = `Bilinmeyen bir fonksiyon çağrısı aldım: ${functionName}.`;
        }

        const messagesForNextTurn = [
          ...apiMessages,
          assistantResponse,
          {
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: functionResultContent,
          }
        ];

        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messagesForNextTurn,
        });
        assistantResponse = completion.choices[0].message;
      }

      if (assistantResponse.content) {
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: assistantResponse.content.trim() }]);
      } else if (lastFunctionResultContent) { // lastFunctionResultContent değişkenini burada kontrol et
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: lastFunctionResultContent }]);
      } else if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
        console.warn("GPT, fonksiyon sonucundan sonra tekrar fonksiyon çağırmak istedi:", assistantResponse.tool_calls);
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: 'İsteğini işledim, ancak devam etmek için ek bilgiye ihtiyacım olabilir veya bir şeyler tam istediğin gibi gitmedi.' }]);
      } else if (!assistantResponse.content) {
        console.warn("Asistan cevabında içerik yok ve tool_calls da yok:", assistantResponse);
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: 'Bir şeyler ters gitti ama ne olduğunu anlayamadım. Tekrar dener misin?' }]);
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