import SwiftUI
import WebKit

private enum AppConfig {
    static let appName = "Tips Cafe"
    static let primaryURL = URL(string: "https://tips.cafe")!
}

final class WebViewState: ObservableObject {
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var isLoading = true
    @Published var pageTitle = AppConfig.appName
}

struct WebContainerView: View {
    @StateObject private var state = WebViewState()
    @State private var webView: WKWebView?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                TipsCafeWebView(
                    url: AppConfig.primaryURL,
                    state: state,
                    webView: $webView
                )
                .ignoresSafeArea(edges: .bottom)

                if state.isLoading {
                    ProgressView("Loading \(AppConfig.appName)...")
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(.top, 12)
                }
            }
            .navigationTitle(state.pageTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    Button {
                        webView?.goBack()
                    } label: {
                        Image(systemName: "chevron.backward")
                    }
                    .disabled(!(state.canGoBack))

                    Button {
                        webView?.goForward()
                    } label: {
                        Image(systemName: "chevron.forward")
                    }
                    .disabled(!(state.canGoForward))

                    Spacer()

                    Button {
                        webView?.reload()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }

                    ShareLink(item: AppConfig.primaryURL) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .tint(Color(red: 0.24, green: 0.76, blue: 0.53))
    }
}

struct TipsCafeWebView: UIViewRepresentable {
    let url: URL
    @ObservedObject var state: WebViewState
    @Binding var webView: WKWebView?

    func makeCoordinator() -> Coordinator {
        Coordinator(state: state)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.backgroundColor = UIColor(red: 7 / 255, green: 17 / 255, blue: 26 / 255, alpha: 1)
        webView.isOpaque = false

        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
        webView.load(request)

        DispatchQueue.main.async {
            self.webView = webView
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        guard uiView.url == nil else {
            return
        }

        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
        uiView.load(request)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        @ObservedObject var state: WebViewState

        init(state: WebViewState) {
            self.state = state
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            updateState(for: webView, isLoading: true)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            updateState(for: webView, isLoading: false)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            updateState(for: webView, isLoading: false)
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            updateState(for: webView, isLoading: false)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            if
                navigationAction.navigationType == .linkActivated,
                let targetURL = navigationAction.request.url,
                let host = targetURL.host,
                host != AppConfig.primaryURL.host
            {
                UIApplication.shared.open(targetURL)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        private func updateState(for webView: WKWebView, isLoading: Bool) {
            DispatchQueue.main.async {
                self.state.isLoading = isLoading
                self.state.canGoBack = webView.canGoBack
                self.state.canGoForward = webView.canGoForward
                self.state.pageTitle = webView.title?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                    ? webView.title!
                    : AppConfig.appName
            }
        }
    }
}
