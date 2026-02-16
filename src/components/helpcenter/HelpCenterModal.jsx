import { useMemo, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Inbox,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import MarkdownView from "./MarkdownView";
import {
  helpCenterArticles,
  helpCenterCategories,
  SUPPORT_WHATSAPP_URL,
} from "./helpCenterData";

const iconByName = {
  Rocket,
  Inbox,
  Users,
  FileText,
  Megaphone,
  Bot,
  ShieldCheck,
  Smartphone,
  CircleHelp,
};

function getSnippet(markdown = "") {
  return String(markdown)
    .replace(/^#+\s+/gm, "")
    .replace(/[-*]\s+/g, "")
    .replace(/\d+\.\s+/g, "")
    .slice(0, 140);
}

export default function HelpCenterModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(helpCenterCategories.map(category => [category.id, false])),
  );

  const articleCountByCategory = useMemo(() => {
    return helpCenterArticles.reduce((acc, article) => {
      acc[article.categoryId] = (acc[article.categoryId] || 0) + 1;
      return acc;
    }, {});
  }, []);

  const categoryMap = useMemo(
    () => Object.fromEntries(helpCenterCategories.map(c => [c.id, c])),
    [],
  );

  const selectedArticle = useMemo(
    () =>
      selectedArticleId
        ? helpCenterArticles.find(article => article.id === selectedArticleId) || null
        : null,
    [selectedArticleId],
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return helpCenterArticles.filter(article => {
      const categoryTitle = categoryMap[article.categoryId]?.title || "";
      return (
        article.title.toLowerCase().includes(q) ||
        article.description.toLowerCase().includes(q) ||
        article.bodyMarkdown.toLowerCase().includes(q) ||
        categoryTitle.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, categoryMap]);

  const categoryArticles = useMemo(() => {
    if (!selectedCategoryId) return [];
    return helpCenterArticles.filter(article => article.categoryId === selectedCategoryId);
  }, [selectedCategoryId]);

  const selectedArticleIndex = useMemo(() => {
    if (!selectedArticle) return -1;
    return categoryArticles.findIndex(item => item.id === selectedArticle.id);
  }, [categoryArticles, selectedArticle]);

  const nextArticle = useMemo(() => {
    if (selectedArticleIndex < 0) return null;
    return categoryArticles[selectedArticleIndex + 1] || null;
  }, [categoryArticles, selectedArticleIndex]);

  const showSearchView = searchQuery.trim().length > 0;
  const showArticleView = !!selectedArticle;
  const showCategoryView = !showSearchView && !showArticleView && !!selectedCategoryId;

  const openCategory = categoryId => {
    setSelectedCategoryId(categoryId);
    setSelectedArticleId(null);
    setSearchQuery("");
    setExpandedGroups(prev => ({ ...prev, [categoryId]: true }));
  };

  const openArticle = articleId => {
    const article = helpCenterArticles.find(x => x.id === articleId);
    if (!article) return;
    setSelectedCategoryId(article.categoryId);
    setSelectedArticleId(articleId);
    setSearchQuery("");
    setExpandedGroups(prev => ({ ...prev, [article.categoryId]: true }));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="!w-[min(96vw,1240px)] !max-w-[min(96vw,1240px)] !p-0 overflow-hidden h-[88vh] rounded-2xl border border-slate-200 shadow-2xl">
        <div className="h-full flex flex-col">
          <DialogHeader className="mb-0 border-b border-slate-200 px-6 py-4 bg-white">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-[30px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-cyan-600 shrink-0" />
                <span className="leading-none">Help & Support</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm px-5 h-12 inline-flex items-center gap-2 whitespace-nowrap shadow-sm leading-none"
                  onClick={() => window.open(SUPPORT_WHATSAPP_URL, "_blank", "noopener,noreferrer")}
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  Chat on WhatsApp
                </Button>
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-slate-100 text-slate-600 border border-transparent hover:border-slate-200"
                  onClick={onClose}
                  aria-label="Close help center"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 min-h-0">
            <aside className="w-[320px] shrink-0 border-r border-slate-200 bg-slate-50/80 p-4 overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">
                Help Center
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={event => {
                    setSearchQuery(event.target.value);
                    setSelectedArticleId(null);
                  }}
                  placeholder="Search documentation..."
                  className="pl-9 bg-white border-slate-200 rounded-xl h-11 text-[15px]"
                />
              </div>

              <div className="mt-4 space-y-2">
                {helpCenterCategories.map(category => {
                  const Icon = iconByName[category.icon] || CircleHelp;
                  const isExpanded = !!expandedGroups[category.id];
                  const articles = helpCenterArticles.filter(
                    article => article.categoryId === category.id,
                  );
                  return (
                    <div key={category.id} className="rounded-xl border border-slate-200/80 bg-white">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 rounded-t-xl transition-colors"
                        onClick={() => {
                          setExpandedGroups(prev => ({
                            ...prev,
                            [category.id]: !prev[category.id],
                          }));
                          openCategory(category.id);
                        }}
                      >
                        <span className="flex items-center gap-2 text-[15px] font-semibold text-slate-700">
                          <Icon size={16} />
                          {category.title}
                        </span>
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="pb-2 px-2 space-y-1 border-t border-slate-100">
                          <button
                            type="button"
                            className={`w-full rounded-lg px-2.5 py-2 text-left text-[14px] font-medium ${
                              selectedCategoryId === category.id && !selectedArticleId
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            onClick={() => openCategory(category.id)}
                          >
                            View all articles
                          </button>
                          {articles.map(article => (
                            <button
                              key={article.id}
                              type="button"
                              className={`w-full rounded-lg px-2.5 py-2 text-left text-[14px] leading-6 ${
                                selectedArticleId === article.id
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                              onClick={() => openArticle(article.id)}
                            >
                              {article.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-7 bg-white">
              {!showSearchView && !showCategoryView && !showArticleView && (
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Help Center</h2>
                  <p className="text-[15px] text-slate-500 mt-1.5">
                    Browse our documentation to find answers
                  </p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {helpCenterCategories.map(category => {
                      const Icon = iconByName[category.icon] || CircleHelp;
                      return (
                        <Card
                          key={category.id}
                          className="cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-slate-300"
                          onClick={() => openCategory(category.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                              <Icon size={18} />
                            </div>
                            <span className="text-xs text-slate-500">
                              {articleCountByCategory[category.id] || 0} articles
                            </span>
                          </div>
                          <h3 className="mt-4 text-[17px] font-semibold text-slate-900 leading-6">
                            {category.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{category.description}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {showSearchView && (
                <div>
                  <p className="text-sm text-slate-500">
                    Support / Search
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">Search Results</h2>
                  <p className="text-sm text-slate-500 mt-1.5">
                    {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for "
                    {searchQuery.trim()}"
                  </p>
                  <div className="mt-4 space-y-3">
                    {searchResults.map(article => (
                      <button
                        key={article.id}
                        type="button"
                        className="w-full text-left rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        onClick={() => openArticle(article.id)}
                      >
                        <p className="text-sm text-emerald-700 font-medium">
                          {categoryMap[article.categoryId]?.title}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                          {article.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{getSnippet(article.bodyMarkdown)}</p>
                      </button>
                    ))}
                    {searchResults.length === 0 && (
                      <Card className="text-sm text-slate-600">
                        No results found. Try another keyword.
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {showCategoryView && (
                <div>
                  <p className="text-sm text-slate-500">
                    Support / {categoryMap[selectedCategoryId]?.title}
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                    {categoryMap[selectedCategoryId]?.title}
                  </h2>
                  <p className="text-[15px] text-slate-500 mt-1.5">
                    {categoryMap[selectedCategoryId]?.description}
                  </p>
                  <div className="mt-5 space-y-3">
                    {categoryArticles.map(article => (
                      <button
                        key={article.id}
                        type="button"
                        className="w-full text-left rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        onClick={() => openArticle(article.id)}
                      >
                        <h3 className="text-base font-semibold text-slate-900">{article.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{article.description}</p>
                        {article.lastUpdated && (
                          <p className="mt-2 text-xs text-slate-500">
                            Last updated: {article.lastUpdated}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showArticleView && (
                <div className="max-w-[820px] w-full mx-auto">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="text-sm text-slate-600 font-medium hover:text-slate-900 inline-flex items-center gap-1"
                      onClick={() => setSelectedArticleId(null)}
                    >
                      <ChevronLeft size={16} />
                      Back to {categoryMap[selectedArticle.categoryId]?.title}
                    </button>
                    {selectedArticle.lastUpdated && (
                      <span className="text-xs text-slate-500">
                        Last updated: {selectedArticle.lastUpdated}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    Support / {categoryMap[selectedArticle.categoryId]?.title} /{" "}
                    <span className="text-slate-700">{selectedArticle.title}</span>
                  </p>
                  <h2 className="text-[40px] leading-[1.15] tracking-tight font-bold text-slate-900 mt-3">
                    {selectedArticle.title}
                  </h2>
                  <p className="text-[19px] leading-8 text-slate-600 mt-3">{selectedArticle.description}</p>

                  {selectedArticle.appliesTo?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedArticle.appliesTo.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-8">
                    <MarkdownView markdown={selectedArticle.bodyMarkdown} skipFirstH1 />
                  </div>

                  {nextArticle ? (
                    <div className="mt-8 border-t border-slate-200 pt-5 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-right text-slate-600 hover:text-slate-900"
                        onClick={() => openArticle(nextArticle.id)}
                      >
                        <span>
                          <span className="block text-xs uppercase tracking-wide text-slate-500">Next</span>
                          <span className="block text-base font-semibold">{nextArticle.title}</span>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                    Still stuck?{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() =>
                        window.open(SUPPORT_WHATSAPP_URL, "_blank", "noopener,noreferrer")
                      }
                    >
                      Chat on WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
