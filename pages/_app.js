// pages/_app.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

function Layout({ children }) {
  const router = useRouter();
  const [openCompanyTabs, setOpenCompanyTabs] = useState([]);

  const currentCompanyId = useMemo(
    () =>
      typeof router.query.companyId === "string" ? router.query.companyId : "",
    [router.query.companyId]
  );

  const currentCompanyName = useMemo(
    () =>
      typeof router.query.companyName === "string" ? router.query.companyName : "",
    [router.query.companyName]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem("auditOpenCompanyTabs");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOpenCompanyTabs(parsed);
        }
      }
    } catch {
      setOpenCompanyTabs([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("auditOpenCompanyTabs", JSON.stringify(openCompanyTabs));
  }, [openCompanyTabs]);

  useEffect(() => {
    if (router.pathname !== "/audit-tasks" || !currentCompanyId) {
      return;
    }
    const fallbackName = currentCompanyId;
    const nextName = currentCompanyName || fallbackName;
    setOpenCompanyTabs((prevTabs) => {
      const withoutCurrent = prevTabs.filter((tab) => tab.id !== currentCompanyId);
      return [{ id: currentCompanyId, name: nextName }, ...withoutCurrent].slice(0, 20);
    });
  }, [router.pathname, currentCompanyId, currentCompanyName]);

  function closeTab(companyId) {
    setOpenCompanyTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== companyId));
    if (router.pathname === "/audit-tasks" && currentCompanyId === companyId) {
      router.push("/");
    }
  }

  return (
    <div style={styles.shell}>
      <div style={styles.content}>{children}</div>

      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>Pages</div>
        <nav style={styles.nav}>
          <Link href="/" style={styles.navLink}>
            Companies
          </Link>
        </nav>

        <div style={styles.tabsSection}>
          <div style={styles.tabsHeader}>Open Companies</div>
          <div style={styles.tabsList}>
            {openCompanyTabs.length === 0 ? (
              <div style={styles.tabsEmpty}>No open company tabs</div>
            ) : (
              openCompanyTabs.map((tab) => {
                const active =
                  router.pathname === "/audit-tasks" && currentCompanyId === tab.id;
                return (
                  <div key={tab.id} style={{ ...styles.tabRow, ...(active ? styles.tabRowActive : {}) }}>
                    <Link
                      href={{
                        pathname: "/audit-tasks",
                        query: { companyId: tab.id, companyName: tab.name },
                      }}
                      style={styles.tabLink}
                    >
                      {tab.name}
                    </Link>
                    <button
                      type="button"
                      style={styles.tabClose}
                      onClick={() => closeTab(tab.id)}
                      aria-label={`Close ${tab.name}`}
                    >
                      x
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "row",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
    background: "#fff",
  },
  content: {
    flex: 1,
    padding: "2rem",
  },
  sidebar: {
    width: 280,
    borderLeft: "1px solid #e5e7eb",
    padding: "1.25rem",
    position: "sticky",
    top: 0,
    height: "100vh",
    background: "#fafafa",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sidebarHeader: {
    fontWeight: 700,
    fontSize: "1.1rem",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: ".5rem",
  },
  navLink: {
    padding: ".6rem .75rem",
    borderRadius: 10,
    textDecoration: "none",
    color: "#111827",
    border: "1px solid transparent",
    background: "#fff",
  },
  tabsSection: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: ".9rem",
  },
  tabsHeader: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".03em",
    color: "#6b7280",
    marginBottom: ".5rem",
  },
  tabsList: {
    display: "flex",
    flexDirection: "column",
    gap: ".45rem",
  },
  tabsEmpty: {
    fontSize: 13,
    color: "#6b7280",
    background: "#fff",
    border: "1px dashed #d1d5db",
    borderRadius: 10,
    padding: ".55rem .65rem",
  },
  tabRow: {
    display: "flex",
    alignItems: "center",
    gap: ".45rem",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    padding: ".25rem .3rem .25rem .55rem",
  },
  tabRowActive: {
    borderColor: "#93c5fd",
    background: "#eff6ff",
  },
  tabLink: {
    flex: 1,
    minWidth: 0,
    color: "#111827",
    textDecoration: "none",
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tabClose: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    lineHeight: 1,
    fontSize: 12,
    color: "#374151",
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },
};
