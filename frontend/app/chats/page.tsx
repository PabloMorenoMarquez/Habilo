"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { useEffect, useState } from "react"
import Navbar from "@/components/navbar"
import chatsData from "@/data/chats.json"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Search, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = { id: string; from: string; text: string; time: string }
type Chat = (typeof chatsData)[number]

export default function ChatsPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>(chatsData as Chat[])
  const [activeChat, setActiveChat] = useState<Chat | null>(chatsData[0] as Chat)
  const [newMessage, setNewMessage] = useState("")
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) router.replace("/")
  }, [isAuthenticated, router])

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return
    const msg: Message = {
      id: `msg_${Date.now()}`,
      from: "me",
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, messages: [...c.messages, msg], lastMessage: msg.text, unread: 0 }
          : c
      )
    )
    setActiveChat((prev) =>
      prev ? { ...prev, messages: [...prev.messages, msg], lastMessage: msg.text, unread: 0 } : null
    )
    setNewMessage("")
  }

  const openChat = (chat: Chat) => {
    setActiveChat(chat)
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)))
    setMobileChatOpen(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-5">Mensajes</h1>
        <div className="flex gap-5 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Sidebar */}
          <div className={cn(
            "w-full md:w-80 shrink-0 flex flex-col border border-border rounded-2xl bg-card overflow-hidden",
            mobileChatOpen && "hidden md:flex"
          )}>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar conversación..." className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left hover:bg-secondary/50 transition-colors",
                    activeChat?.id === chat.id && "bg-primary/5"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={chat.withUser.avatar} alt={chat.withUser.name} />
                    <AvatarFallback>{chat.withUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{chat.withUser.name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{chat.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{chat.serviceTitle}</p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs shrink-0 bg-primary text-primary-foreground rounded-full">
                      {chat.unread}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat window */}
          <div className={cn(
            "flex-1 border border-border rounded-2xl bg-card overflow-hidden flex-col",
            mobileChatOpen ? "flex" : "hidden md:flex"
          )}>
            {activeChat ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileChatOpen(false)}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activeChat.withUser.avatar} alt={activeChat.withUser.name} />
                    <AvatarFallback>{activeChat.withUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{activeChat.withUser.name}</p>
                    <p className="text-xs text-muted-foreground">{activeChat.serviceTitle}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {activeChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        msg.from === "me" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.from === "them" && (
                        <Avatar className="h-7 w-7 shrink-0 mt-1">
                          <AvatarImage src={activeChat.withUser.avatar} />
                          <AvatarFallback>{activeChat.withUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                          msg.from === "me"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-secondary-foreground rounded-bl-sm"
                        )}
                      >
                        <p>{msg.text}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.from === "me" ? "text-primary-foreground/60 text-right" : "text-muted-foreground"
                        )}>{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Escribe un mensaje..."
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()} size="icon" className="shrink-0">
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Selecciona una conversación para comenzar
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
